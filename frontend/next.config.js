/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
    },
    images: {
        domains: ['localhost', 'ai-scientist-lab-notebook-dev-public-cdn.s3.amazonaws.com'],
    },
    env: {
        API_URL: process.env.API_URL || 'http://localhost:3001',
    },
}

module.exports = nextConfig
