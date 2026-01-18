'use client';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-white text-black p-6 font-sans">
            <h1 className="text-3xl font-bold mb-4">Privacy Policy for WhatOTP</h1>
            <p className="text-sm text-gray-500 mb-8">Effective Date: January 18, 2026</p>

            <div className="space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
                    <p>
                        WhatOTP ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our Telegram Mini App.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Data Collection and Storage</h2>
                    <p>
                        <strong>Secure Data Storage.</strong> All your Two-Factor Authentication (2FA) tokens and secrets are securely stored on our private database servers. We employ multiple layers of advanced security and strong encryption to ensure that your data remains inaccessible to unauthorized parties. Our infrastructure is isolated in a private environment where no one can reach, designed specifically to safeguard your sensitive information.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. Third-Party Services</h2>
                    <p>
                        This app operates within the Telegram ecosystem. Telegram may collect metadata as described in their own Privacy Policy. We may use standard third-party libraries for UI components or animations, but these do not track you or collect personal information.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. User Rights</h2>
                    <p>
                        You have full control over your data. You can delete your accounts directly within the app, which will naturally and permanently remove the encrypted data from our secure servers.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us via our developer channel: <a href="https://t.me/bottercc" className="text-blue-600 underline">@bottercc</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
