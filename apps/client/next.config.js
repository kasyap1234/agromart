/** @type {import('next').NextConfig} */
const bundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    // Force relative base in the browser so requests always go through the same origin.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Bundle optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      '@radix-ui/react-icons',
      'recharts'
    ]
  },
  
  // Enable React Server Components
  reactStrictMode: true,
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Enable compression
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  
  async rewrites() {
    // Proxy API requests to backend defined by NEXT_PUBLIC_API_URL at build time
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    // If target is relative (starts with /), let outer reverse proxy handle it
    if (raw.startsWith('/')) {
      return [];
    }
    // Ensure the destination includes /api prefix
    const withApi = raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`;
    return [
      {
        source: '/api/:path*',
        destination: `${withApi.replace(/\/$/, '')}/:path*`,
      },
    ];
  },
};

module.exports = bundleAnalyzer(nextConfig);