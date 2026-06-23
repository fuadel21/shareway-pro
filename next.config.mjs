/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/reservar',
        destination: '/#buscar',
        permanent: false
      }
    ];
  }
};

export default nextConfig;
