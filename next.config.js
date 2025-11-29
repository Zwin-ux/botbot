/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Also ignore TS errors during build since we have legacy JS files
        ignoreBuildErrors: true,
    }
}

module.exports = nextConfig
