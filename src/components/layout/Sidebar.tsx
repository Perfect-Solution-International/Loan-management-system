"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  CircleAlert,
  ClipboardList,
  FileClock,
  FileText,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogIn,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";

const groups = [
  {
    label: "WORKSPACE",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Loans", href: "/loans", icon: HandCoins },
      { label: "Repayments", href: "/repayments", icon: Wallet },
    ],
  },
  {
    label: "MONITORING",
    items: [
      { label: "Collections", href: "/collections", icon: ClipboardList },
      { label: "Overdue loans", href: "/overdue", icon: CircleAlert },
      { label: "Reports", href: "/reports", icon: ChartNoAxesCombined },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { label: "Staff & roles", href: "/staff", icon: Users },
      { label: "Audit logs", href: "/audit-logs", icon: FileClock },
      { label: "Settings", href: "/settings", icon: Settings2 },
    ],
  },
];

export default function Sidebar({
  onNavigate,
  mobile = false,
  staffActive = false,
}: {
  onNavigate?: () => void;
  mobile?: boolean;
  staffActive?: boolean;
}) {
  const pathname = usePathname();
  return (
    <aside
      className={`app-sidebar ${mobile ? "" : "hidden md:flex"}`}
      aria-label="Workspace sidebar"
    >
      <Link
        href="/"
        onClick={onNavigate}
        className="app-brand"
        aria-label="PSI One overview"
      >
        <span className="brand-mark">
          <Landmark size={21} strokeWidth={1.7} />
        </span>
        <span>
          <strong>
            PSI One<span className="text-blue-200">.</span>
          </strong>
          <small>LOAN MANAGEMENT</small>
        </span>
      </Link>
      <nav className="sidebar-navigation" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-group-label">{group.label}</p>
            {group.items.map((item) => {
              const routeActive =
                item.href === "/"
                  ? pathname === "/" || pathname === "/dashboard"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const active =
                item.href === "/staff"
                  ? staffActive
                  : item.href === "/settings"
                    ? routeActive && !staffActive
                    : routeActive;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className="nav-link"
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon size={18} strokeWidth={1.65} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Link href="/login" onClick={onNavigate}>
          <LogIn size={15} />
          Logout
        </Link>
      </div>
    </aside>
  );
}
