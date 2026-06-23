import path from 'path';

const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(process.cwd());
    return config;
  }
};

export default nextConfig;
