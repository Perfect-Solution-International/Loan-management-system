'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
  highlight?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Customer Directory', href: '/customers', icon: '👥' },
  { name: 'Loans List', href: '/loans', icon: '💳' },
  { name: 'Issue New Loan', href: '/loans/new', icon: '💰' },
  { name: "Open Today's Collection", href: '/collections', icon: '📅' },
  { name: 'Arrears', href: '/arrears', icon: '⚠️' },
  { name: 'Reports & Analytics', href: '/reports', icon: '📈' },
  { name: 'System Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-68 bg-[#09090b] text-zinc-300 min-h-screen p-4 flex flex-col justify-between border-r border-zinc-800 shrink-0">
      <div>
        {/* Brand Logo & Name Header */}
        <div className="mb-6 px-1 pt-1 pb-3 border-b border-zinc-800/60">
          <BrandLogo href="/dashboard" size="md" theme="dark" />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold tracking-tight transition-all duration-150 ${
                  isActive
                    ? 'bg-[#d90429] text-white shadow-lg shadow-red-600/30 font-black'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-900/90'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base select-none">{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status & Log Out */}
      <div className="space-y-3 pt-4 border-t border-zinc-800/80">
        {/* System Status Online Badge */}
        <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Status</span>
          </div>
          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
            ONLINE
          </span>
        </div>

        {/* Log Out Button */}
        <Link
          href="/login"
          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-zinc-900 rounded-xl transition"
        >
          <LogOut size={15} />
          <span>Log Out</span>
        </Link>
      </div>
    </aside>
  );
}