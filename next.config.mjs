/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['iyzipay', 'firebase-admin'],
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
