import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  },
};

export default nextConfig;
