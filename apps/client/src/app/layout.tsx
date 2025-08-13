import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import '@/styles/globals.css';

// Expose CSS variable for Tailwind `fontFamily.sans` to read
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AgroMart - Inventory Management System',
  description: 'Professional inventory management system for agro-tech companies',
  keywords: 'inventory, agriculture, agro-tech, management, system',
  authors: [{ name: 'AgroMart Team' }],
  robots: 'noindex, nofollow', // Remove this in production
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
