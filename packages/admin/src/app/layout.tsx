import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from '@/components/session-provider';
import { RepositoryProvider } from '@/contexts/repository-context';
import { NavigationProvider } from '@/contexts/navigation-context';
import { UploadProvider } from '@/contexts/upload-context';
import { NavigationWrapper } from '@/components/navigation-wrapper';
import { UploadStatusIndicator } from '@/components/media/upload-status-indicator';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitCMS Admin',
  description: 'Universal GitHub-Based Content Management System',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <SessionProvider>
          <RepositoryProvider>
            <NavigationProvider>
              <UploadProvider>
                <div className="min-h-screen bg-gray-50 font-sans antialiased">
                  <NavigationWrapper />
                  {children}
                  <UploadStatusIndicator />
                </div>
              </UploadProvider>
            </NavigationProvider>
          </RepositoryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
