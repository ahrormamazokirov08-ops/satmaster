"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Users,
  Award,
  BookOpen,
  PlusCircle,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { satStorage } from "@/lib/storage/sat-storage";
import { SATAssignment, SATQuestion, SATSubmission } from "@/lib/types/sat";
import { toast } from "sonner";

export default function TeacherDashboardPage() {
  const [assignments, setAssignments] = useState<SATAssignment[]>([]);
  const [submissions, setSubmissions] = useState<SATSubmission[]>([]);
  const [questions, setQuestions] = useState<SATQuestion[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setAssignments(satStorage.getAssignments());
    setSubmissions(satStorage.getSubmissions());
    setQuestions(satStorage.getQuestions());
  }, []);

  const totalSubmissions = submissions.length;
  const avgClassScore =
    totalSubmissions > 0
      ? Math.round(
          submissions.reduce((acc, curr) => acc + curr.percentage, 0) /
            totalSubmissions
        )
      : 0;

  const handleCopyLink = (code: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/hw/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success(`Student share link copied to clipboard! (Code: ${code})`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-indigo-950/40 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              Digital SAT Homework & Auto-Grading Suite
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, Teacher!
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-xl">
              Create and share Digital SAT homework in seconds. Your students get
              frictionless instant access, and every question is auto-graded the
              moment they submit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              asChild
              variant="outline"
              className="border-slate-700 bg-slate-800/60 hover:bg-slate-850 text-white gap-2"
            >
              <Link href="/hw" target="_blank">
                <ExternalLink className="h-4 w-4 text-blue-400" />
                <span>Test Student View</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="gradient"
              className="gap-2 shadow-lg shadow-blue-500/25"
            >
              <Link href="/dashboard/assignments/new">
                <PlusCircle className="h-4 w-4" />
                <span>Create New Homework</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Active Homework Sets
            </span>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {assignments.length}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>Ready for students</span>
            </p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Total Submissions
            </span>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {totalSubmissions}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Auto-graded with instant solutions
            </p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Class Avg Score
            </span>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {avgClassScore}%
            </div>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Based on recent homework drills</span>
            </p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Pre-loaded Questions
            </span>
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {questions.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Math & Reading/Writing bank
            </p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Active Assignments & Class Weak Spots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Homework */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Active Assignments
              </h2>
              <p className="text-xs text-slate-400">
                Click any assignment to review student answers and difficulty
                breakdown
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              <Link href="/dashboard/assignments">
                View All
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {assignments.map((assignment) => {
              const assignSubs = submissions.filter(
                (s) => s.assignmentId === assignment.id
              );
              const assignAvg =
                assignSubs.length > 0
                  ? Math.round(
                      assignSubs.reduce((acc, c) => acc + c.percentage, 0) /
                        assignSubs.length
                    )
                  : null;

              return (
                <Card
                  key={assignment.id}
                  className="p-5 border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            assignment.section === "math"
                              ? "border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs"
                              : assignment.section === "reading-writing"
                              ? "border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs"
                              : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"
                          }
                        >
                          {assignment.section === "math"
                            ? "SAT Math"
                            : assignment.section === "reading-writing"
                            ? "SAT Reading & Writing"
                            : "Mixed SAT"}
                        </Badge>

                        <span className="text-xs font-mono font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          Code: {assignment.code}
                        </span>

                        {assignment.timeLimitMinutes ? (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {assignment.timeLimitMinutes} min
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                        <Link href={`/dashboard/assignments/${assignment.id}`}>
                          {assignment.title}
                        </Link>
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-1">
                        {assignment.description ||
                          `${assignment.questionIds.length} questions included.`}
                      </p>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-semibold text-white">
                          {assignSubs.length} submission
                          {assignSubs.length === 1 ? "" : "s"}
                        </div>
                        {assignAvg !== null && (
                          <div className="text-[11px] text-emerald-400 font-medium">
                            Class Avg: {assignAvg}%
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCopyLink(assignment.code, assignment.id)
                          }
                          className="h-8 px-2.5 text-xs border-slate-700 hover:bg-slate-800 gap-1.5"
                          title="Copy student link"
                        >
                          {copiedId === assignment.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                              <span>Share Link</span>
                            </>
                          )}
                        </Button>

                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-blue-400 hover:text-blue-300"
                        >
                          <Link href={`/dashboard/assignments/${assignment.id}`}>
                            Gradebook
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: High Priority Class Weak Spots & Diagnostic */}
        <div className="space-y-6">
          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Class Trouble Spots
                </h3>
                <p className="text-[11px] text-slate-400">
                  Questions students missed most often
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-300">
                    Trig: Complementary Angles
                  </span>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                    66% Error Rate
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Students confused sin(A) = cos(B) with opposite ratios. Recommended
                  warmup topic for your next session.
                </p>
                <div className="text-[11px] text-slate-400">
                  Seen in: <span className="text-slate-300">Math Drill (Code: MATH-01)</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-850/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Parabola Vertex Form
                  </span>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                    33% Error Rate
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Students identified vertex coordinates correctly but flipped
                  the upward/downward maximum direction.
                </p>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full text-xs border-slate-800 bg-slate-900/60 hover:bg-slate-800"
            >
              <Link href="/dashboard/bank">
                Browse More Practice Questions
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </Card>

          {/* Quick Share Help Card */}
          <Card className="p-5 border-blue-500/20 bg-gradient-to-b from-blue-950/20 to-slate-900/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
              How students submit homework:
            </h4>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Click <strong className="text-white">Share Link</strong> above or send your 6-digit Code (e.g. <span className="font-mono text-blue-300">MATH-01</span>).
              </li>
              <li>
                Students open the link on phone or laptop, type their name, and answer the questions.
              </li>
              <li>
                Results grade instantly, and their full answers appear on your dashboard!
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
