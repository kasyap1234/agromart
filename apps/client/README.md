# AgroMart Frontend

This is the frontend application for AgroMart, built with Next.js 14, TypeScript, and shadcn/ui components.

## Features

- **Dashboard**: Overview of key metrics and recent activity
- **Product Management**: Create, view, and manage products with advanced search and filtering
- **Supplier Management**: Manage suppliers with search functionality
- **Customer Management**: Manage customers with search functionality
- **Purchase Orders**: Create and track purchase orders with status tracking
- **Inventory Management**: Track inventory levels and batches
- **Reporting**: Generate reports on low stock items and expiring batches

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context API + SWR for data fetching
- **UI Components**: shadcn/ui (built on Radix UI and Tailwind CSS)
- **Data Fetching**: SWR (stale-while-revalidate)
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React and Heroicons
- **Charts**: Recharts

## Performance Optimizations

- Code splitting with dynamic imports
- Bundle optimization with `optimizePackageImports`
- Image optimization with Next.js Image component
- Font optimization with `optimizeFonts`
- Server-side rendering (SSR) and static site generation (SSG) where appropriate
- Client-side caching with SWR
- Bundle analysis with `@next/bundle-analyzer`

## Folder Structure

```
src/
├── app/                 # App Router pages
│   ├── dashboard/       # Dashboard page
│   ├── products/        # Product management pages
│   ├── suppliers/       # Supplier management pages
│   ├── customers/       # Customer management pages
│   ├── purchase-orders/ # Purchase order pages
│   └── ...              # Other pages
├── components/          # Shared components
│   ├── layout/          # Layout components
│   └── ui/              # shadcn/ui components
├── context/             # React context providers
├── lib/                 # Utility functions and API client
├── styles/              # Global styles
└── types/               # TypeScript types
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues
- `npm run type-check` - Run TypeScript type checking
- `npm run analyze` - Analyze bundle size

## UI Components

We use shadcn/ui components which are built on top of Radix UI and styled with Tailwind CSS. All components are located in `src/components/ui/`.

### Custom Components

- **StatsCard**: Dashboard statistics cards
- **ProductFilters**: Advanced product search and filtering
- **LoadingSkeleton**: Loading placeholders for better UX

## Performance Best Practices

1. **Code Splitting**: Pages and components are automatically code-split by Next.js
2. **Image Optimization**: All images use the Next.js Image component
3. **Font Optimization**: Fonts are optimized with `next/font`
4. **Bundle Optimization**: Unused components are tree-shaken
5. **Caching**: SWR provides client-side caching with revalidation
6. **Lazy Loading**: Heavy components are dynamically imported when needed

## Styling

We use Tailwind CSS for styling with a custom color palette defined in `tailwind.config.js`. The color palette is designed for an agro-tech application with:

- **Primary**: Green shades for main actions and branding
- **Secondary**: Purple shades for secondary actions
- **Accent**: Orange shades for important highlights
- **Neutral**: Gray shades for backgrounds and text
- **Semantic Colors**: Success, warning, error, and info colors

## API Integration

The frontend communicates with the backend API through the `apiClient` utility in `src/lib/api.ts`. All API calls are properly typed with TypeScript interfaces.

## State Management

We use a combination of:

1. **React Context API** for global state (authentication, user preferences)
2. **SWR** for server state and caching
3. **React Hook Form** for form state

## Testing

- Unit tests with Jest and React Testing Library
- End-to-end tests with Playwright (in `e2e/` directory)

## Deployment

The application is configured for Docker deployment with a standalone output. Environment variables can be configured through `.env` files.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint:fix` and `npm run type-check`
5. Commit your changes
6. Push to the branch
7. Create a pull request

## License

This project is proprietary and confidential. All rights reserved.