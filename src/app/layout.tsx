import type { Metadata } from 'next';
import './globals.css';   // Keep this line if your file exists

export const metadata: Metadata = {
  title: 'PrismAI',
  description: 'Intelligent Document Assistant',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f9f7ff] antialiased">
        {children}
      </body>
    </html>
  );
}