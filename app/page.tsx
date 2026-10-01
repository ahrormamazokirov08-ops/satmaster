"use client";

import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileCheck2,
  Users,
  Award,
  BookOpen,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  BarChart3,
  UserCheck,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-blue-600/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[350px] h-[220px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl space-y-8">
          <Badge
            variant="default"
            className="px-3.5 py-1 text-xs gap-1.5 shadow-sm border-blue-500/30 bg-blue-500/10 text-blue-300"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            Digital SAT Teacher & Class Management Suite
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.1]">
            Assign & Check SAT Homework{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-500 bg-clip-text text-transparent">
              for Every Class.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Organize your teaching with separate classes (cohorts), pick from curated Digital SAT questions, and let the system auto-grade student homework instantly.
          </p>

          {/* TWO METHOD ENTRY TOOL */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="p-4 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose Access Method:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Method 1: Teacher */}
                <Link
                  href="/dashboard"
                  className="p-5 rounded-xl border border-blue-500/40 bg-gradient-to-b from-blue-950/40 to-slate-900 hover:border-blue-400 hover:from-blue-950/70 transition-all text-left space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-[10px]">
                      Teacher Portal
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                      <span>I am the Teacher</span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Create & manage classes, assign homework per class, view gradebooks, and inspect mistake heatmaps.
                    </p>
                  </div>
                </Link>

                {/* Method 2: Student */}
                <Link
                  href="/hw"
                  className="p-5 rounded-xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-900 hover:border-emerald-400 hover:from-emerald-950/60 transition-all text-left space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-[10px]">
                      Student Portal
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <span>I am a Student</span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Enter your Class Code / PIN, take practice tests, and get immediate score results with explanations.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Multiple Class Management
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              100% Auto-Graded
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Reading, Writing & Math
            </span>
          </div>
        </div>
      </section>

      {/* Class Management Showcase Section */}
      <section className="container mx-auto px-4 pb-20">
        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="max-w-2xl space-y-2 mb-8">
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
              Organized Teaching
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Keep Separate Classes & Targeted Homework
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Create different class cohorts (e.g., Morning Group, Weekend Intensive, Class 10-A) with unique PIN codes for each class.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 border-slate-800 bg-slate-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                  PIN: CLASS-10A
                </span>
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                  3 Assignments
                </Badge>
              </div>
              <h3 className="text-base font-bold text-white">Class 10-A SAT Prep</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Standard high school SAT preparation group covering both Math & Reading.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800">
                Schedule: Mon/Wed 9:00 AM
              </div>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                  PIN: MATH-AM
                </span>
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                  4 Assignments
                </Badge>
              </div>
              <h3 className="text-base font-bold text-white">SAT Math Morning Cohort</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Intensive algebra, quadratics & geometry focus for advanced scoring.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800">
                Schedule: Tue/Thu 10:30 AM
              </div>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                  PIN: RW-WEEKEND
                </span>
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                  2 Assignments
                </Badge>
              </div>
              <h3 className="text-base font-bold text-white">Weekend RW Intensive</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Passage breakdown, rhetoric synthesis, and grammar conventions.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800">
                Schedule: Saturday 2:00 PM
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-400">
            <GraduationCap className="h-4 w-4 text-blue-400" />
            <span>SATMaster • Digital SAT Homework & Class Management Suite</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-slate-300">
              Teacher Portal
            </Link>
            <Link href="/dashboard/classes" className="hover:text-slate-300">
              My Classes
            </Link>
            <Link href="/dashboard/assignments/new" className="hover:text-slate-300">
              Create Homework
            </Link>
            <Link href="/hw" className="hover:text-slate-300">
              Student Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
