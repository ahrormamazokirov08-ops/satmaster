"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  PlusCircle,
  Database,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Classes",
    href: "/dashboard/classes",
    icon: Users,
  },
  {
    name: "Assignments & Grading",
    href: "/dashboard/assignments",
    icon: FileCheck2,
  },
  {
    name: "Create Homework",
    href: "/dashboard/assignments/new",
    icon: PlusCircle,
  },
  {
    name: "SAT Question Bank",
    href: "/dashboard/bank",
    icon: Database,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800 bg-slate-950/70 backdrop-blur-xl h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-white group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="tracking-tight text-base font-bold">
              SAT<span className="text-blue-400">Master</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase -mt-1">
              Teacher Suite
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Teaching Workspace
        </div>
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive
                    ? "text-blue-400"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Student Link Sandbox Preview */}
      <div className="p-4 border-t border-slate-800">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Student Portal</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
              Live Link
            </Badge>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Test how your students see and submit homework sets.
          </p>
          <Link
            href="/hw"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            <span>Open Student View</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
