import type { Metadata } from "next";
import { Suspense } from "react";
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
        <Suspense fallback={<main className="p-12 text-center">Loading…</main>}>
          <DataProvider>{children}</DataProvider>
        </Suspense>
      </body>
    </html>
  );
}
