/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['iyzipay', 'firebase-admin'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
