"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  PlusCircle,
  CalendarDays,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Activity,
  X,
  Receipt,
  AlertOctagon,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { useData } from '@/providers/data-provider';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  badgeVariant?: 'red' | 'amber' | 'slate' | 'purple';
  section?: string;
}

const navSections = [
  {
    title: 'CORE MENU',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'User Management',
        href: '/users',
        icon: Users,
      },
      {
        name: 'Loans List',
        href: '/loans',
        icon: Wallet,
      },
      {
        name: 'Issue New Loan',
        href: '/loans/new',
        icon: PlusCircle,
        badge: 'New',
        badgeVariant: 'red' as const,
      },
    ],
  },
  {
    title: 'COLLECTIONS & RISK',
    items: [
      {
        name: "Today's Collection",
        href: '/collections',
        icon: CalendarDays,
        badge: 'Daily',
        badgeVariant: 'amber' as const,
      },
      {
        name: 'Repayments Ledger',
        href: '/repayments',
        icon: Receipt,
      },
      {
        name: 'Arrears Register',
        href: '/arrears',
        icon: AlertTriangle,
        badge: 'Risk',
        badgeVariant: 'red' as const,
      },
      {
        name: 'Overdue Payments',
        href: '/overdue',
        icon: AlertOctagon,
        badge: 'Overdue',
        badgeVariant: 'red' as const,
      },
    ],
  },
  {
    title: 'SYSTEM & INSIGHTS',
    items: [
      {
        name: 'Reports & Analytics',
        href: '/reports',
        icon: BarChart3,
      },
      {
        name: 'Activity & Audit Logs',
        href: '/audit-logs',
        icon: Activity,
      },
      {
        name: 'System Settings',
        href: '/settings',
        icon: Settings,
      },
    ],
  },
];

function isPathActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/' || pathname === '/dashboard';
  }
  if (href === '/loans') {
    return pathname === '/loans' || (pathname.startsWith('/loans/') && pathname !== '/loans/new');
  }
  if (href === '/loans/new') {
    return pathname === '/loans/new';
  }
  if (href === '/users') {
    return pathname.startsWith('/users') || pathname.startsWith('/customers') || pathname.startsWith('/staff');
  }
  if (href === '/customers') {
    return pathname === '/customers' || (pathname.startsWith('/customers/') && pathname !== '/customers/new');
  }
  if (href === '/staff') {
    return pathname.startsWith('/staff');
  }
  if (href === '/collections') {
    return pathname.startsWith('/collections');
  }
  if (href === '/repayments') {
    return pathname.startsWith('/repayments');
  }
  if (href === '/online-payments') {
    return pathname.startsWith('/online-payments');
  }
  if (href === '/arrears') {
    return pathname.startsWith('/arrears');
  }
  if (href === '/overdue') {
    return pathname.startsWith('/overdue');
  }
  if (href === '/reports') {
    return pathname.startsWith('/reports');
  }
  if (href === '/audit-logs') {
    return pathname.startsWith('/audit-logs');
  }
  if (href === '/settings') {
    return pathname.startsWith('/settings');
  }
  return pathname === href;
}

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const isStaff = pathname === "/staffdashboard";
  const { onlinePayments } = useData();
  const pendingOnlineCount = (onlinePayments || []).filter((p) => p.status === 'PENDING').length;

  const dynamicNavSections = React.useMemo(() => {
    return [
      {
        title: 'CORE MENU',
        items: [
          {
            name: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
          },
          {
            name: 'User Management',
            href: '/users',
            icon: Users,
          },
          {
            name: 'Loans List',
            href: '/loans',
            icon: Wallet,
          },
          {
            name: 'Issue New Loan',
            href: '/loans/new',
            icon: PlusCircle,
            badge: 'New',
            badgeVariant: 'red' as const,
          },
        ],
      },
      {
        title: 'COLLECTIONS & RISK',
        items: [
          {
            name: "Today's Collection",
            href: '/collections',
            icon: CalendarDays,
            badge: 'Daily',
            badgeVariant: 'amber' as const,
          },
          {
            name: 'Repayments Ledger',
            href: '/repayments',
            icon: Receipt,
          },
          {
            name: 'Online Payments',
            href: '/online-payments',
            icon: CreditCard,
            badge: pendingOnlineCount > 0 ? `${pendingOnlineCount}` : undefined,
            badgeVariant: 'amber' as const,
          },
          {
            name: 'Arrears Register',
            href: '/arrears',
            icon: AlertTriangle,
            badge: 'Risk',
            badgeVariant: 'red' as const,
          },
          {
            name: 'Overdue Payments',
            href: '/overdue',
            icon: AlertOctagon,
            badge: 'Overdue',
            badgeVariant: 'red' as const,
          },
        ],
      },
      {
        title: 'SYSTEM & INSIGHTS',
        items: [
          {
            name: 'Reports & Analytics',
            href: '/reports',
            icon: BarChart3,
          },
          {
            name: 'Activity & Audit Logs',
            href: '/audit-logs',
            icon: Activity,
          },
          {
            name: 'System Settings',
            href: '/settings',
            icon: Settings,
          },
        ],
      },
    ];
  }, [pendingOnlineCount]);

  return (
    <aside
      className={`bg-[#0b0f19] text-slate-200 flex flex-col justify-between border-r border-slate-800/80 shrink-0 ${
        isMobile ? 'w-full h-full p-4' : 'w-64 min-h-screen p-4 shadow-xl'
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-800/80">
          <BrandLogo href="/dashboard" size="md" theme="dark" />
          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {dynamicNavSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                {section.title}
              </p>

              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isPathActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 ${
                        active
                          ? 'bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                          : 'text-slate-200 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          size={18}
                          className={`shrink-0 transition-colors ${
                            active
                              ? 'text-white'
                              : 'text-slate-400 group-hover:text-white'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                            active
                              ? 'bg-white/25 text-white'
                              : item.badgeVariant === 'red'
                              ? 'bg-red-600 text-white border border-red-500'
                              : item.badgeVariant === 'amber'
                              ? 'bg-amber-400 text-slate-950 font-black border border-amber-300'
                              : 'bg-slate-700 text-white border border-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Footer User Profile & System Status */}
      <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2 shrink-0">
        {/* User Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg ${
                isStaff
                  ? "bg-gradient-to-br from-blue-600 to-indigo-700"
                  : "bg-gradient-to-br from-red-600 to-rose-700"
              } text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0 ring-1 ring-white/10`}
            >
              {isStaff ? "FO" : "AD"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {isStaff ? "Field Officer" : "Admin Officer"}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {isStaff ? "Loan Officer" : "Administrator"}
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
            title="Sign Out"
          >
            <LogOut size={15} />
          </Link>
        </div>

        {/* System Online Indicator */}
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold text-white">System Core</span>
          </div>
          <span className="text-emerald-400 font-extrabold uppercase tracking-wider text-[10px] font-mono">
            ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
