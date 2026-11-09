# WhatOTP

**A two-factor authenticator that lives inside Telegram.**

WhatOTP is a Telegram Mini App for TOTP codes (the 6-digit codes used by Google, GitHub, Discord, Binance and almost every other service). Your codes are tied to your Telegram account, so they're there on every device where you use Telegram — no extra app to install. It looks and feels like a native iPhone app, in light or dark mode, in 11 languages.

Open it: **[@what_otp_bot](https://t.me/what_otp_bot)**

---

## Features

### Codes
- **Live codes** with a countdown ring that turns red in the last 5 seconds.
- **Tap to copy**, with a haptic tick and a "Copied" toast.
- **Swipe left** on a code for Edit and Delete, iOS-style.
- **Search** across services and issuers.
- **Add by QR scan** (Telegram's native scanner) or by typing the setup key — the form shows the **real code live** as you type, so you know the key works before saving.
- **Brand icons** for 3,000+ services (via [Simple Icons](https://simpleicons.org)) and a colour for each entry.

### Security
- **Biometric unlock** using Telegram's BiometricManager (Face ID / fingerprint), prompted automatically on open.
- **6-digit passcode** as an alternative, with a keypad that also works with your keyboard.
- **Verified email** for account recovery.
- **Recovery with a 24-hour safety window:** removing authentication or deleting your account locks it for 24 hours, during which it can be cancelled.
- **Deletion warnings** by email and Telegram message, with a link to cancel if it wasn't you.

### Transfer
- **Export** selected accounts as a Google Authenticator migration QR.
- **Import** from Google Authenticator by scanning its export QR.

### Experience
- **iOS-style design** throughout: large titles, grouped lists, action sheets, pull-down menus, push transitions and blurred backdrops.
- **Fullscreen on phones**, respecting the notch and Telegram's own controls.
- **Haptic feedback** everywhere (can be turned off in Settings).
- **Light, dark or system theme**, synced to your account.
- **11 languages:** English, বাংলা, Deutsch, Español, Français, हिंदी, Bahasa Indonesia, Italiano, Português, Русский, 中文. [Request another →](https://github.com/nasirul786/WhatOTP/issues/new?template=language_request.yml)

### Support the project
- **Donate in USDT** on Tron, BNB Smart Chain, TON, Solana, Polygon or Ethereum (via OxaPay), directly in the app.
- **Donation wall** showing supporters (or "Anonymous", if they prefer).

---

## Tech stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion, Lottie |
| Database | MySQL (`mysql2`) |
| TOTP | [`otpauth`](https://github.com/hectorm/otpauth) |
| Telegram | [Telegram Mini Apps](https://core.telegram.org/bots/webapps) (`telegram-web-app.js`), Bot API 8.0+ |
| Email | Nodemailer (SMTP) |
| Payments | [OxaPay](https://oxapay.com) white-label USDT payments |

---

## Self-hosting

### Requirements
- Node.js 20+
- MySQL 8 (or compatible)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- An HTTPS URL for the app (in development, [ngrok](https://ngrok.com) works)
- Optional: SMTP credentials (email recovery and deletion notices) and an OxaPay merchant key (donations)

### 1. Install

```bash
git clone https://github.com/nasirul786/WhatOTP.git
cd WhatOTP
npm install
```

### 2. Configure

Copy `env.example` to `.env` and fill it in:

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | MySQL connection |
| `BOT_TOKEN` | Your bot's token; also used to verify Telegram login data |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Outgoing email (verification codes, deletion notices) |
| `BOT_APP_URL` | Link that opens your Mini App, used in notifications (e.g. `https://t.me/your_bot?startapp`) |
| `OXAPAY_MERCHANT_API_KEY` | OxaPay merchant key, only needed for donations |

### 3. Create the database

Run [`db.sql`](db.sql) against your database. The `donations` table is also created automatically on first use.

All dates are stored in UTC.

### 4. Run

```bash
npm run dev
```

The app only works fully inside Telegram (it needs Telegram's login data). Expose your dev server over HTTPS, e.g. `ngrok http 3000`, and add the ngrok hostname to `allowedDevOrigins` in [`next.config.ts`](next.config.ts).

For production:

```bash
npm run build
npm start
```

### 5. Connect the bot

1. In [@BotFather](https://t.me/BotFather), send `/newapp`, choose your bot, and give it your app's HTTPS URL.
2. Set your bot's webhook to `https://<your-domain>/api/bot` so `/start` sends the welcome message.
3. For donations, make sure the app is reachable over HTTPS: OxaPay sends payment confirmations to `/api/donate/callback`.

---

## Project structure

```
app/
  page.tsx              Main screen: unlock, codes list, settings (all client-side)
  api/                  Auth, accounts, email, passcode, biometrics, donations, bot webhook
components/             UI: HomeView, SettingsView, AccountRow, sheets, drawers, pickers
lib/
  locales/*.json        Translations (one file per language)
  haptics.ts            Haptic feedback (respects the user's setting)
  useTotp.ts            Live TOTP code hook
  oxapay.ts             OxaPay client
public/lotties/         Animations, including flags/<code>.json for each language
db.sql                  Database schema
```

### Adding a language

1. Copy `lib/locales/en.json` to `lib/locales/<code>.json` (use the Telegram / ISO 639-1 code) and translate the values.
2. Add an animated flag at `public/lotties/flags/<code>.json`.

It appears in the language list automatically.

---

## Privacy

WhatOTP stores your authenticator entries (service, issuer, secret key, icon and colour) on the server, linked to your Telegram user ID, so you can reach them from any device. If you self-host, that data is in **your** database. Read the full [privacy policy](app/privacy/page.tsx) (served at `/privacy`).

You can delete your account and all its data from the app at any time, after a 24-hour safety window.

---

## Contributing

Issues and pull requests are welcome. To ask for a new language, use the [language request form](https://github.com/nasirul786/WhatOTP/issues/new?template=language_request.yml).

## License

MIT
