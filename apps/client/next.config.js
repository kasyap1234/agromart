/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  // Performance optimizations
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
  },

  // Bundle optimization and code splitting
  webpack: (config, { isServer, buildId }) => {
    // Tree shaking and bundle optimization
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 50000,
          cacheGroups: {
            // Vendor chunks for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate chunk for UI components
            ui: {
              test: /[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 20,
            },
            // Charts and heavy components
            charts: {
              test: /[\\/]node_modules[\\/](recharts|framer-motion)[\\/]/,
              name: 'charts-motion',
              chunks: 'all',
              priority: 30,
            },
            // Route-specific chunks
            pages: {
              test: /[\\/]src[\\/]app[\\/]/,
              name: (module, chunks) => {
                const match = module.identifier().match(/src[\\/]app[\\/]([^[\\/]]+)/);
                return match ? `page-${match[1]}` : 'pages';
              },
              chunks: 'all',
              priority: 40,
              minChunks: 1,
            },
            // Heavy libraries
            heavy: {
              test: /[\\/]node_modules[\\/](axios|react-csv|html2canvas|jspdf)[\\/]/,
              name: 'heavy-libs',
              chunks: 'all',
              priority: 50,
            },
          },
        },
      };
    }

    // Critical CSS extraction and optimization
    if (!isServer) {
      // Add build hash to asset names for cache busting
      config.output.filename = (chunkData) => {
        return chunkData.chunk.name === 'main' || chunkData.chunk.name === 'vendors'
          ? `[name]-[contenthash].js`
          : `[name].js`;
      };

      config.output.chunkFilename = '[name]-[contenthash].js';
    }

    return config;
  },

  // Bundle size warnings and limits
  webpack: (config, { isServer, buildId }) => {
    // Tree shaking and bundle optimization
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 50000,
          cacheGroups: {
            // Vendor chunks for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate chunk for UI components
            ui: {
              test: /[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 20,
            },
            // Charts and heavy components
            charts: {
              test: /[\\/]node_modules[\\/](recharts|framer-motion)[\\/]/,
              name: 'charts-motion',
              chunks: 'all',
              priority: 30,
            },
            // Route-specific chunks
            pages: {
              test: /[\\/]src[\\/]app[\\/]/,
              name: (module, chunks) => {
                const match = module.identifier().match(/src[\\/]app[\\/]([^[\\/]]+)/);
                return match ? `page-${match[1]}` : 'pages';
              },
              chunks: 'all',
              priority: 40,
              minChunks: 1,
            },
            // Heavy libraries
            heavy: {
              test: /[\\/]node_modules[\\/](axios|react-csv|html2canvas|jspdf)[\\/]/,
              name: 'heavy-libs',
              chunks: 'all',
              priority: 50,
            },
          },
        },
      };
    }

    // Critical CSS extraction and optimization
    if (!isServer) {
      // Add build hash to asset names for cache busting
      config.output.filename = (chunkData) => {
        return chunkData.chunk.name === 'main' || chunkData.chunk.name === 'vendors'
          ? `[name]-[contenthash].js`
          : `[name].js`;
      };

      config.output.chunkFilename = '[name]-[contenthash].js';
    }

    return config;
  },

  // Image optimization
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },

  // Compression
  compress: true,

  // Security headers and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Cache static assets aggressively
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Logging for performance monitoring
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Output configuration for CDN deployment
  output: 'standalone',

  // Fix workspace root detection
  outputFileTracingRoot: process.cwd(),

  // Disable x-powered-by header
  poweredByHeader: false,
};

module.exports = withBundleAnalyzer(nextConfig);