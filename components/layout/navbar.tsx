"use client";

import Link from "next/link";
import { GraduationCap, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="tracking-tight text-xl">
            SAT<span className="text-blue-400">Master</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link href="#features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#question-bank" className="hover:text-white transition-colors">
            SAT Question Bank
          </Link>
          <Link href="#grading" className="hover:text-white transition-colors">
            Instant Auto-Grading
          </Link>
          <Link href="#student-experience" className="hover:text-white transition-colors">
            Student Experience
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-xs">
            <Link href="/hw" target="_blank" className="flex items-center gap-1.5">
              <span>Student Portal</span>
              <ExternalLink className="h-3 w-3 text-blue-400" />
            </Link>
          </Button>
          <Button asChild variant="gradient" size="sm" className="gap-2 shadow-md shadow-blue-500/20">
            <Link href="/dashboard">
              Teacher Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
