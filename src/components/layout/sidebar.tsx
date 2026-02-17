"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  Car,
  Package,
  CreditCard,
  Users,
  FileText,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

type Role = "ADMIN" | "MEKANIK" | "SUPERADMIN";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  submenus?: { label: string; href: string }[];
};

const adminMenu: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Worklist", href: "/worklist", icon: ClipboardList },
  { label: "History", href: "/history", icon: History },
  { label: "Vehicle Record", href: "/vehicles/vehicle-record", icon: Car },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Billing", href: "/billing", icon: CreditCard },
];

const mekanikMenu: MenuItem[] = [
  { label: "Worklist", href: "/mekanik/worklist", icon: ClipboardList },
  { label: "History", href: "/history", icon: History },
  { label: "Vehicle Record", href: "/vehicles/vehicle-record", icon: Car },
  { label: "Billing", href: "/billing", icon: CreditCard },
];

export default function Sidebar({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "Laporan": false
  });

  const toggleExpand = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  let menus = role === "MEKANIK" ? [...mekanikMenu] : [...adminMenu];

  if (role === "SUPERADMIN" || role === "ADMIN") {
    menus.push({
      label: "Laporan", href: "#", icon: FileText,
      submenus: [
        { label: "Kunjungan", href: "/reports/visits" },
        { label: "Billing", href: "/reports/billing" },
        { label: "Stok Opname", href: "/reports/stock" },
        { label: "Pembelian", href: "/reports/purchases" },
      ]
    });
  }

  if (true) {
    menus.push({ label: "Manajemen User", href: "/users", icon: Users });
  }

  return (
    <aside className="w-64 bg-sky-950 text-slate-300 border-r border-sky-900 flex flex-col transition-all duration-300 h-full">
      <div className="h-16 flex items-center justify-center border-b border-sky-900/50 bg-sky-950/50 backdrop-blur-sm">
        <Image
          src="/logo.png"
          alt="RWA Garage"
          width={140}
          height={50}
          className="w-auto h-12 object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          priority
        />
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-white tracking-wide">
            RWA GARAGE
          </span>
          <span className="text-xs text-slate-400">
            Workshop Management System
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3">
        <div className="mb-2 px-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Menu Utama
        </div>
        <nav className="space-y-1">
          {menus.map((menu) => {
            const active = pathname.startsWith(menu.href) || (menu.submenus && pathname.startsWith("/reports"));
            const Icon = menu.icon;
            const isExpanded = expanded[menu.label];

            if (menu.submenus) {
              return (
                <div key={menu.href} className="group">
                  <div
                    onClick={() => toggleExpand(menu.label)}
                    className={clsx(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer text-slate-400 hover:bg-sky-900 hover:text-white hover:pl-4",
                      active && "text-white"
                    )}>
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {menu.label}
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                  {isExpanded && (
                    <div className="ml-9 mt-1 space-y-1 border-l-2 border-sky-800/50 pl-2">
                      {menu.submenus.map(sub => {
                        const isSubActive = pathname === sub.href || (sub.href.includes("?tab=") && searchParams.get("tab") === sub.href.split("=")[1]);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={onNavigate}
                            className={clsx(
                              "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:text-white",
                              isSubActive
                                ? "text-blue-400 bg-sky-900/40"
                                : "text-slate-500"
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={menu.href}
                href={menu.href}
                onClick={onNavigate}
                className={clsx(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-900/20"
                    : "text-slate-400 hover:bg-sky-900 hover:text-white hover:pl-4"
                )}
              >
                <Icon className={clsx("h-5 w-5 transition-colors", active ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
                {menu.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sky-900">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-600/30">
            <span className="text-sm font-bold text-blue-500">
              {role.charAt(0)}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">Logged in as</p>
            <p className="truncate text-sm text-slate-500">{role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
