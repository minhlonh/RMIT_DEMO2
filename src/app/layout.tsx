import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import type { ReactNode } from 'react';
import AppProviders from '@/components/AppProviders';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gia Đình Số | Family Digital Hearth',
  description:
    'Mái ấm số cho ba thế hệ: kết nối ông bà, bố mẹ và các cháu với AI nhân văn. / A humane digital home for three generations.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFDF9',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" data-mode="standard" suppressHydrationWarning>
      <body className={beVietnamPro.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}