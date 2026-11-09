import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["curious-necessarily-hyacinth.ngrok-free.dev"],
  // Single source of truth for the version shown in Settings.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
