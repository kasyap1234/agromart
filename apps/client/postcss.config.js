const config = {
  plugins: {
    // Tailwind CSS v4.1 - use the dedicated PostCSS plugin
    '@tailwindcss/postcss': {},
    // Autoprefixer for browser compatibility
    autoprefixer: {
      // Ensure compatibility with Next.js 15.5 and React 19
      grid: true,
      flexbox: true,
    },
    // Add CSS optimization for better performance with React 19
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: false,
        }],
      },
    } : {}),
  },
};

module.exports = config;