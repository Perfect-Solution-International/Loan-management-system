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
    <aside className="w-64 bg-[#09090b] text-zinc-300 min-h-screen p-4 flex flex-col justify-between border-r border-zinc-800">
      <div>
        <div className="mb-8 px-2">
          <h1 className="text-base font-bold text-white tracking-wide">
            PSI One Loan Management System
          </h1>
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
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/25'
                    : 'hover:bg-zinc-900 text-zinc-300'
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