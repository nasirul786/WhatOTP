import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createWhiteLabelPayment } from '@/lib/oxapay';
import { ensureDonationsTable, publicOrigin, userFromRequest } from '@/lib/donationsDb';
import { MAX_DONATION, MIN_DONATION, USDT_NETWORKS, normalizeStatus, type DonationPayment } from '@/lib/donations';

/** Creates a USDT white-label payment for a donation and records it as pending. */
export async function POST(req: NextRequest) {
    try {
        const user = userFromRequest(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const amount = Math.round(Number(body.amount) * 100) / 100;
        if (!Number.isFinite(amount) || amount < MIN_DONATION || amount > MAX_DONATION) {
            return NextResponse.json({ error: `Amount must be between ${MIN_DONATION} and ${MAX_DONATION} USDT` }, { status: 400 });
        }
        const network = USDT_NETWORKS.find((n) => n.id === body.network)?.id;
        if (!network) return NextResponse.json({ error: 'Unsupported network' }, { status: 400 });
        const anonymous = !!body.anonymous;

        const orderId = `don-${user.id}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const origin = publicOrigin(req);
        const payment = await createWhiteLabelPayment({
            amount,
            network,
            orderId,
            description: `WhatOTP donation from ${anonymous ? 'anonymous' : user.username ? '@' + user.username : user.id}`,
            callbackUrl: origin ? `${origin}/api/donate/callback` : undefined,
        });

        await ensureDonationsTable();
        await pool.query(
            `INSERT INTO donations
              (order_id, track_id, user_id, first_name, last_name, username, photo_url, is_anonymous,
               amount, network, status, pay_amount, address, memo, qr_code, expired_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?, ?)`,
            [
                orderId, payment.track_id, user.id, user.first_name, user.last_name || null,
                user.username || null, user.photo_url || null, anonymous ? 1 : 0,
                amount, network, payment.pay_amount, payment.address, payment.memo || null,
                payment.qr_code || null, payment.expired_at,
            ]
        );

        const result: DonationPayment = {
            trackId: payment.track_id,
            amount,
            payAmount: Number(payment.pay_amount),
            payCurrency: (payment.pay_currency || 'USDT').toUpperCase(),
            network: payment.network || network,
            address: payment.address,
            memo: payment.memo || '',
            qrCode: payment.qr_code || '',
            expiredAt: Number(payment.expired_at),
            status: normalizeStatus('waiting'),
        };
        return NextResponse.json({ success: true, payment: result });
    } catch (error) {
        console.error('Error creating donation:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
