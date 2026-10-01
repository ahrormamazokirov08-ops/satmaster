"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  FileCheck2,
  PlusCircle,
  Database,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Assignments & Grading", href: "/dashboard/assignments", icon: FileCheck2 },
  { name: "Create Homework", href: "/dashboard/assignments/new", icon: PlusCircle },
  { name: "SAT Question Bank", href: "/dashboard/bank", icon: Database },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="text-slate-400 hover:text-white"
        aria-label="Toggle Navigation"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-6 flex flex-col justify-between animate-in fade-in-0 slide-in-from-top-4 duration-200">
          <div className="space-y-2">
            <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Teaching Workspace
            </div>
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                    isActive
                      ? "bg-blue-600/15 text-blue-400 border border-blue-500/30"
                      : "text-slate-300 hover:bg-slate-900"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-1">
              <GraduationCap className="h-4 w-4" />
              SAT Teacher Suite
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Frictionless homework assignment and auto-grading platform.
            </p>
            <Link
              href="/hw"
              target="_blank"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              <span>Launch Student Portal</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
