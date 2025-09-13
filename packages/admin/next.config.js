/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  images: {
    domains: ['github.com', 'avatars.githubusercontent.com', 'raw.githubusercontent.com'],
  },
  transpilePackages: ['@gitcms/core'],
};

module.exports = nextConfig;
