/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Correct: at the root level
  allowedDevOrigins: ['192.168.1.9', '*.192.168.1.9', 'http://192.168.1.9:3000'],

  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'http://98.94.99.226:5000/:path*',
      },
    ];
  },
};

module.exports = nextConfig;