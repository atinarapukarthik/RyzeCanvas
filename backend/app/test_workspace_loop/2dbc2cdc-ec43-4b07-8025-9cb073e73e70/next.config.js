import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable the new app directory (Server Components by default)
  experimental: {
    appDir: true,
  },
  // Tailwind CSS works out‑of‑the‑box; no extra config needed here
  // Add any future Next.js customizations below
};

export default nextConfig;