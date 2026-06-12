/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['firebase-admin'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
