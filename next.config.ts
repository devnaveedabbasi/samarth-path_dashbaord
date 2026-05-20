/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'http://98.94.99.226:5000/api/:path*', 
      },
    ];
  },
};

module.exports = nextConfig;