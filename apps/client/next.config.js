/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "@heroicons/react",
      "react-hot-toast",
      "zod",
      "@hookform/resolvers",
    ],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const apiBaseUrl = backendUrl.endsWith("/api")
      ? backendUrl
      : `${backendUrl}/api`;

    return [
      // Proxy all API requests to the backend server
      {
        source: "/api/auth/:path*",
        destination: `${apiBaseUrl}/auth/:path*`,
      },
      {
        source: "/api/products/:path*",
        destination: `${apiBaseUrl}/products/:path*`,
      },
      {
        source: "/api/customers/:path*",
        destination: `${apiBaseUrl}/customers/:path*`,
      },
      {
        source: "/api/suppliers/:path*",
        destination: `${apiBaseUrl}/suppliers/:path*`,
      },
      {
        source: "/api/inventory/:path*",
        destination: `${apiBaseUrl}/inventory/:path*`,
      },
      {
        source: "/api/batches/:path*",
        destination: `${apiBaseUrl}/batches/:path*`,
      },
      {
        source: "/api/sales/:path*",
        destination: `${apiBaseUrl}/sales/:path*`,
      },
      {
        source: "/api/purchase-orders/:path*",
        destination: `${apiBaseUrl}/purchase-orders/:path*`,
      },
      {
        source: "/api/reports/:path*",
        destination: `${apiBaseUrl}/reports/:path*`,
      },
      {
        source: "/api/analytics/:path*",
        destination: `${apiBaseUrl}/analytics/:path*`,
      },
      {
        source: "/api/units",
        destination: `${apiBaseUrl}/products/units`,
      },
      // Catch-all for any other API routes
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);