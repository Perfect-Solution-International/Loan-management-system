import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/providers/data-provider";

export const metadata: Metadata = {
  title: "PSI One LMS - Loan Management System",
  description: "Centralized web application for loan operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
