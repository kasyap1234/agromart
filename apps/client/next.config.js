/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  experimental: {
    optimizePackageImports: [
      "@heroicons/react",
      "react-hot-toast",
      "zod",
      "@hookform/resolvers",
      "lucide-react",
      "date-fns",
      "clsx",
      "tailwind-merge",
    ],
    optimizeCss: true,
    scrollRestoration: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizeServerReact: true,
    typedRoutes: true,
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    reactCompiler: false,
  },
 
  eslint: {
    ignoreDuringBuilds: false,
  },
 
  typescript: {
    ignoreBuildErrors: false,
  },
 
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
  },
 
  compress: true,
};
 
module.exports = nextConfig;