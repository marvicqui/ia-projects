import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  transpilePackages: [
    '@jvp/shared-agents',
    '@jvp/shared-auth',
    '@jvp/shared-db',
    '@jvp/shared-notifications',
    '@jvp/shared-ui',
    '@jvp/module-cfdi',
    '@jvp/module-laboral',
    '@jvp/module-contratos',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default config;
