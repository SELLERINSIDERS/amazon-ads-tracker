/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
