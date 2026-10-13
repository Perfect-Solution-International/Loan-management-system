'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Customers', href: '/customers' },
  { name: 'New Loan', href: '/loans/new' },
  { name: 'Loan Calculations', href: '/loan-calculations' },
  { name: 'Collections', href: '/collections' },
  { name: 'Repayments', href: '/repayments' },
  { name: 'Documents', href: '/documents' },
  { name: 'Reports', href: '/reports' },
  { name: 'Staff Management', href: '/staff' },
  { name: 'Audit Logs', href: '/audit-logs' },
  { name: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="mb-8 px-2">
          <h1 className="text-xl font-bold text-white tracking-wide">PSI One LMS</h1>
          <p className="text-xs text-slate-400">Loan Management System</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-2 pt-4 border-t border-slate-800 text-xs text-slate-500">
        Administrator Portal
      </div>
    </aside>
  );
}