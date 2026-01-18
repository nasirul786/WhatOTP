import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const localesDir = path.join(process.cwd(), 'lib/locales');
        const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

        const languages = files.map(file => {
            const content = fs.readFileSync(path.join(localesDir, file), 'utf-8');
            const json = JSON.parse(content);
            return {
                code: json.code,
                name: json.name,
                flag: json.flag
            };
        });

        return NextResponse.json(languages);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to load languages" }, { status: 500 });
    }
}
