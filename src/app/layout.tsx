import type { Metadata } from 'next';
import './globals.css';
import { DataProvider } from '@/providers/data-provider';

export const metadata: Metadata = {
  title: 'PSI One Loan Management System',
  description: 'Centralized web application for loan operations',
  icons: {
    icon: '/logos/psi-logo.png',
    apple: '/logos/psi-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 font-sans antialiased text-slate-800">
        <DataProvider>
          {children}
        </DataProvider>
      </body>
    </html>
  );
}