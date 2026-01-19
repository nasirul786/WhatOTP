# WhatOTP - Telegram 2FA Mini App

**WhatOTP** is a secure, elegant, and feature-rich Two-Factor Authentication (2FA) authenticator built specifically as a Telegram Mini App. It allows users to protect their accounts with Time-based One-Time Passwords (TOTP) directly within Telegram, backed by secure server-side encryption and biometric authentication.

## ✨ Features

- **🔐 Secure Storage**: User secrets are encrypted and stored securely on private servers.
- **🛡️ Biometric & Passcode Protection**: Integrated with Telegram's Biometric Manager for FaceID/TouchID support and a fallback 6-digit passcode.
- **☁️ Cloud Sync (Telegram ID)**: Accounts are tied to your Telegram user ID, allowing access across devices where you use Telegram.
- **📥 Import / 📤 Export**: 
  - Scan QR codes to add accounts.
  - Export accounts via QR code or file to migrate to other apps.
- **🌍 Multi-Language Support**:
  Just add your language translations file into lib/locales with language_code.json file name and add its lottie file to the public/lotties/flags/language_code.json to add enw language.
  - 🇺🇸 English
  - 🇮🇳 Hindi (हिन्दी)
  - 🇧🇩 Bengali (বাংলা)
  - 🇮🇩 Indonesian (Bahasa Indonesia)
  - And many more
- **🎨 Modern UI**:
  - Beautiful dark/light mode support.
  - Smooth animations using Lottie and Framer Motion.
  - Brand icons support via Simple Icons.
- **🤖 Bot Integration**: A companion bot (`/start`) that provides a welcome guide and quick app launch.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Animations**: Framer Motion, Lottie React
- **Database**: MySQL (via `mysql2`)
- **Cryptography**: `otpauth` (TOTP generation), `bcryptjs` (Hashing), `crypto` (Encryption)
- **Deployment**: Vercel (recommended)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MySQL Database
- Telegram Bot Token (from @BotFather)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nasirul786/WhatOTP.git
   cd WhatOTP
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and copy the .env.example to it

4. **Database Setup**:
   manually create the tables using the sql from `db.sql` on this repo

5. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to verify it's running. Note that Mini App specific features (like `webApp` context) will only work when opened inside Telegram.
   You can use [ngrok](https://ngrok.com/) to get https url of your localhost

## 📱 Telegram Configuration

1. Open **@BotFather** on Telegram.
2. Create a new command `/newapp`.
3. Select your bot.
4. Enter the title (e.g., "WhatOTP") and short description.
5. Provide the HTTPS URL of your deployed application (e.g., `https://your-project.vercel.app`).
6. Used the generated Direct Link to access the Mini App.

## 📄 Privacy Policy

We prioritize user privacy. Access the privacy policy at `/privacy`. 
- **Data**: We store encrypted TOTP secrets linked to your Telegram ID.
- **Deletion**: Users can permanently delete their account and all associated data via the app settings (subject to a 24-hour security period).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
