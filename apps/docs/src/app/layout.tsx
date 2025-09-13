import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GitCMS Documentation',
  description: 'Complete documentation for GitCMS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <div className="min-h-screen bg-gray-50">{children}</div>
      </body>
    </html>
  );
}
