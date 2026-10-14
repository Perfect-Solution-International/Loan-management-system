import type { Metadata } from 'next';
import './globals.css';
import { DataProvider } from '@/providers/data-provider';

export const metadata: Metadata = {
  title: 'PSI One LMS - Loan Management System',
  description: 'Centralized web application for loan operations',
  icons: {
    icon: '/logos/psi-logo.jpg',
    apple: '/logos/psi-logo.jpg',
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