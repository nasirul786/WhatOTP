
import protobuf from 'protobufjs/light'; // Use light version for smaller bundle if possible, or just 'protobufjs'

const root = protobuf.Root.fromJSON({
    nested: {
        MigrationPayload: {
            fields: {
                otpParameters: { rule: "repeated", type: "OtpParameters", id: 1 },
                version: { type: "int32", id: 2 },
                batchSize: { type: "int32", id: 3 },
                batchIndex: { type: "int32", id: 4 },
                batchId: { type: "int32", id: 5 }
            }
        },
        OtpParameters: {
            fields: {
                secret: { type: "bytes", id: 1 },
                name: { type: "string", id: 2 },
                issuer: { type: "string", id: 3 },
                algorithm: { type: "Algorithm", id: 4 },
                digits: { type: "int32", id: 5 },
                type: { type: "OtpType", id: 6 },
                counter: { type: "int64", id: 7 }
            }
        },
        Algorithm: {
            values: {
                ALGORITHM_UNSPECIFIED: 0,
                ALGORITHM_SHA1: 1,
                ALGORITHM_SHA256: 2,
                ALGORITHM_SHA512: 3,
                ALGORITHM_MD5: 4
            }
        },
        OtpType: {
            values: {
                OTP_TYPE_UNSPECIFIED: 0,
                OTP_TYPE_HOTP: 1,
                OTP_TYPE_TOTP: 2
            }
        }
    }
});

const MigrationPayload = root.lookupType("MigrationPayload");

// Base32 Utils (RFC 4648)
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const map: { [key: string]: number } = {};
for (let i = 0; i < alphabet.length; i++) {
    map[alphabet[i]] = i;
}

function base32ToBytes(s: string): Uint8Array {
    s = s.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
    const len = s.length;
    const n = Math.floor((len * 5) / 8);
    const bytes = new Uint8Array(n);
    let buffer = 0;
    let bitsLeft = 0;
    let index = 0;

    for (let i = 0; i < len; i++) {
        buffer = (buffer << 5) | map[s[i]];
        bitsLeft += 5;
        if (bitsLeft >= 8) {
            bytes[index++] = (buffer >> (bitsLeft - 8)) & 0xFF;
            bitsLeft -= 8;
        }
    }
    return bytes;
}

function bytesToBase32(bytes: Uint8Array): string {
    let buffer = 0;
    let bitsLeft = 0;
    let result = '';

    for (let i = 0; i < bytes.length; i++) {
        buffer = (buffer << 8) | bytes[i];
        bitsLeft += 8;
        while (bitsLeft >= 5) {
            result += alphabet[(buffer >> (bitsLeft - 5)) & 0x1F];
            bitsLeft -= 5;
        }
    }
    if (bitsLeft > 0) {
        result += alphabet[(buffer << (5 - bitsLeft)) & 0x1F];
    }
    return result;
}

export function encodeMigrationUrl(accounts: any[]): string {
    const otpParameters = accounts.map(acc => {
        let secretBytes: Uint8Array;
        try {
            secretBytes = base32ToBytes(acc.secret);
        } catch (e) {
            console.warn("Invalid Base32 secret", acc.secret);
            return null;
        }

        if (!secretBytes || secretBytes.length === 0) return null;

        return {
            secret: secretBytes,
            name: acc.service_name + (acc.issuer ? ` (${acc.issuer})` : ''),
            issuer: acc.issuer || acc.service_name,
            algorithm: 1, // SHA1
            digits: 6,
            type: 2, // TOTP
        };
    }).filter(Boolean);

    const payload = {
        otpParameters,
        version: 1,
        batchSize: 1,
        batchIndex: 0,
        batchId: Math.floor(Math.random() * 100000)
    };

    const errMsg = MigrationPayload.verify(payload);
    if (errMsg) throw Error(errMsg);

    const message = MigrationPayload.create(payload);
    const buffer = MigrationPayload.encode(message).finish();

    // Convert buffer to base64
    // Browser/Node compatible base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return `otpauth-migration://offline?data=${encodeURIComponent(base64)}`;
}

export function decodeMigrationUrl(url: string): any[] {
    const urlObj = new URL(url);
    const data = urlObj.searchParams.get('data');
    if (!data) throw new Error("No data param");

    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    const message = MigrationPayload.decode(bytes);
    const object = MigrationPayload.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
    }) as any;

    if (!object.otpParameters) return [];

    return object.otpParameters.map((p: any) => {
        // p.secret is base64 string automatically converted by toObject if bytes: String? 
        // No, protobufjs toObject with bytes:String option might output base64? 
        // Actually, protobufjs decoding to object for bytes might be buffer or base64 depending on options.
        // Let's assume Buffer or Uint8Array if defaults, or base64 if forced.
        // We need simplify logic. 'bytes' field is usually Uint8Array in modern protobufjs.
        // But toObject converts to defaults.

        // Re-decode just to be safe if it's not base32

        // Wait, p.secret from toObject might be base64 string if JSON options set?
        // Let's check 'secret' type.

        // Actually, let's look at raw message access
        let secretBytes: Uint8Array;
        if (p.secret && p.secret.length) {
            // If array like
            if (p.secret instanceof Uint8Array) secretBytes = p.secret;
            else if (Array.isArray(p.secret)) secretBytes = new Uint8Array(p.secret);
            else {
                // base64 string usually if converted
                const bin = atob(p.secret);
                secretBytes = new Uint8Array(bin.length);
                for (let k = 0; k < bin.length; k++) secretBytes[k] = bin.charCodeAt(k);
            }
        } else {
            secretBytes = new Uint8Array(0);
        }

        const secretBase32 = bytesToBase32(secretBytes);

        return {
            service_name: p.name || 'Unknown',
            secret: secretBase32,
            issuer: p.issuer || '',
            // type: p.type === 2 ? 'totp' : 'hotp', 
            // algorithm: ...
        };
    });
}
