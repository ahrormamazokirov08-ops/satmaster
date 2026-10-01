import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600/30">
      {/* Student Global Header */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2 font-bold text-sm text-white group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span>
            SAT<span className="text-blue-400">Master</span>
          </span>
          <span className="text-[10px] text-slate-400 font-normal ml-1 bg-slate-850 px-1.5 py-0.5 rounded border border-slate-700">
            Student Portal
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Teacher Dashboard →
        </Link>
      </header>

      {/* Main Student Test Area */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
