import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the owner console be opened at http://console.localhost:3000 in development.
  allowedDevOrigins: ["console.localhost", "*.localhost"],
};

export default nextConfig;
