// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Automatically redirect to the main dashboard or loan page when visiting root URL
  redirect('/loans/new');
}