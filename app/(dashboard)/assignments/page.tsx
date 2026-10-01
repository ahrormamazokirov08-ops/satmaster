"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck2,
  PlusCircle,
  Search,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Clock,
  Calendar,
  Users,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { satStorage } from "@/lib/storage/sat-storage";
import { SATAssignment, SATSubmission } from "@/lib/types/sat";
import { toast } from "sonner";

export default function AssignmentsListPage() {
  const [assignments, setAssignments] = useState<SATAssignment[]>([]);
  const [submissions, setSubmissions] = useState<SATSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setAssignments(satStorage.getAssignments());
    setSubmissions(satStorage.getSubmissions());
  }, []);

  const handleCopyLink = (code: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/hw/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success(`Student share link copied! (Code: ${code})`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete assignment "${title}"?`)) {
      satStorage.deleteAssignment(id);
      setAssignments(satStorage.getAssignments());
      toast.success("Assignment deleted.");
    }
  };

  const filtered = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection =
      filterSection === "all" || a.section === filterSection;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Assignments & Grading
          </h1>
          <p className="text-sm text-slate-400">
            Manage your Digital SAT homework sets, copy student links, and check auto-graded scores.
          </p>
        </div>

        <Button asChild variant="gradient" className="gap-2 shrink-0">
          <Link href="/dashboard/assignments/new">
            <PlusCircle className="h-4 w-4" />
            <span>Create Homework</span>
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by homework title or PIN code..."
            className="pl-9 bg-slate-900/80 border-slate-800 text-sm"
          />
        </div>

        {/* Section Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: "All Sections", val: "all" },
            { label: "SAT Math", val: "math" },
            { label: "Reading & Writing", val: "reading-writing" },
            { label: "Mixed Sets", val: "mixed" },
          ].map((pill) => (
            <Button
              key={pill.val}
              variant={filterSection === pill.val ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterSection(pill.val)}
              className={`text-xs px-3 rounded-lg ${
                filterSection === pill.val
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {pill.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-slate-800 bg-slate-900/40">
          <FileCheck2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">
            No assignments found
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search filter or create a new homework set from the question bank.
          </p>
          <Button asChild variant="gradient" size="sm" className="mt-4 gap-2">
            <Link href="/dashboard/assignments/new">
              <PlusCircle className="h-4 w-4" />
              <span>Create Homework</span>
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((assignment) => {
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
                className="p-5 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-1">
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
                          : "Mixed Review"}
                      </Badge>

                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        PIN: {assignment.code}
                      </span>

                      <span className="text-xs text-slate-400">
                        {assignment.questionIds.length} Questions
                      </span>

                      {assignment.timeLimitMinutes ? (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assignment.timeLimitMinutes} min limit
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Untimed</span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-white hover:text-blue-400 transition-colors">
                      <Link href={`/dashboard/assignments/${assignment.id}`}>
                        {assignment.title}
                      </Link>
                    </h2>

                    <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                      {assignment.description || "Digital SAT practice set."}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created: {new Date(assignment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Middle / Right: Stats & Action Buttons */}
                  <div className="flex flex-wrap lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="text-left lg:text-right">
                        <div className="text-xs font-bold text-white flex items-center gap-1 lg:justify-end">
                          <Users className="h-3.5 w-3.5 text-blue-400" />
                          <span>{assignSubs.length} Submissions</span>
                        </div>
                        {assignAvg !== null ? (
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 lg:justify-end">
                            <Award className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Average: {assignAvg}%</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            No submissions yet
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyLink(assignment.code, assignment.id)
                        }
                        className="h-8 px-3 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-750 gap-1.5"
                      >
                        {copiedId === assignment.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied Link!</span>
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
                        variant="gradient"
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        <Link href={`/dashboard/assignments/${assignment.id}`}>
                          View Gradebook
                        </Link>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(assignment.id, assignment.title)}
                        className="h-8 px-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete assignment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
