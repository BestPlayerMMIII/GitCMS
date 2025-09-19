import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from '@/components/session-provider';
import { Navigation } from '@/components/navigation';
import { RepositoryProvider } from '@/contexts/repository-context';
import { NavigationWrapper } from '@/components/navigation-wrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitCMS Admin',
  description: 'Universal GitHub-Based Content Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <SessionProvider>
          <RepositoryProvider>
            <div className="min-h-screen bg-gray-50 font-sans antialiased">
              <NavigationWrapper />
              {children}
            </div>
          </RepositoryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
