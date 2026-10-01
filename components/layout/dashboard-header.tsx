"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, Plus, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/user-nav";
import { MobileNav } from "@/components/layout/mobile-nav";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 sm:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <MobileNav />
        {/* Mobile brand text */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden font-bold text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-base">
            SAT<span className="text-blue-400">Master</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <Button asChild size="sm" variant="outline" className="hidden md:flex gap-1.5 border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs">
          <Link href="/hw" target="_blank">
            <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
            <span>Student Portal Link</span>
          </Link>
        </Button>

        <Button asChild size="sm" variant="gradient" className="gap-2 shadow-sm shadow-blue-500/20">
          <Link href="/dashboard/assignments/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Homework</span>
            <span className="sm:hidden">New HW</span>
          </Link>
        </Button>

        <div className="h-5 w-px bg-slate-800" />
        <UserNav />
      </div>
    </header>
  );
}
