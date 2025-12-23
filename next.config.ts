import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ],
  },
  env: {
    NEXT_PUBLIC_WOMPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
    WOMPI_SECRET_KEY: process.env.WOMPI_SECRET_KEY,
    WOMPI_WEBHOOK_SECRET: process.env.WOMPI_WEBHOOK_SECRET,
  },
};

export default nextConfig;
