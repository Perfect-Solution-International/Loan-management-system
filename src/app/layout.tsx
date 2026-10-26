import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/providers/data-provider";

export const metadata: Metadata = {
  title: 'PSI One Loan Management System',
  description: 'Centralized web application for loan operations',
  icons: {
    icon: '/logos/psi-logo.png',
    apple: '/logos/psi-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="lms-ui font-sans antialiased">
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
