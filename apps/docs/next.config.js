/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  transpilePackages: ['@gitcms/core'],
};

module.exports = nextConfig;
