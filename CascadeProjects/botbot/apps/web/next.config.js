/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@botbot/core', '@botbot/db', '@botbot/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'openai'],
  },
};

module.exports = nextConfig;
