"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Copy,
  Check,
  FileCheck2,
  Calendar,
  Clock,
  Trash2,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { satStorage } from "@/lib/storage/sat-storage";
import { SATClass, SATAssignment, SATSubmission } from "@/lib/types/sat";
import { toast } from "sonner";

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<SATClass[]>([]);
  const [assignments, setAssignments] = useState<SATAssignment[]>([]);
  const [submissions, setSubmissions] = useState<SATSubmission[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Class Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");

  useEffect(() => {
    setClasses(satStorage.getClasses());
    setAssignments(satStorage.getAssignments());
    setSubmissions(satStorage.getSubmissions());
  }, []);

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      toast.error("Please enter a class name");
      return;
    }

    const codeToUse =
      classCode.trim().toUpperCase() ||
      `CLASS-${Math.floor(100 + Math.random() * 900)}`;

    const newClass = satStorage.createClass({
      name: className.trim(),
      code: codeToUse,
      description: description.trim() || undefined,
      schedule: schedule.trim() || undefined,
    });

    setClasses(satStorage.getClasses());
    setIsModalOpen(false);
    toast.success(`Class "${newClass.name}" created! (Code: ${newClass.code})`);

    // Reset
    setClassName("");
    setClassCode("");
    setDescription("");
    setSchedule("");
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(`Class Code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeleteClass = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete class "${name}"?`)) {
      satStorage.deleteClass(id);
      setClasses(satStorage.getClasses());
      toast.success("Class deleted.");
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-blue-400" />
            <span>My SAT Classes & Cohorts</span>
          </h1>
          <p className="text-sm text-slate-400">
            Create different classes (morning groups, weekend cohorts, high school classes) and keep separate homework sets for each.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          variant="gradient"
          className="gap-2 shrink-0 shadow-md shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Class</span>
        </Button>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <Card className="p-12 text-center border-slate-800 bg-slate-900/40">
          <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No classes created yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create your first class cohort to organize homework sets and track student results per group.
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="gradient"
            size="sm"
            className="mt-4 gap-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Class</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => {
            const classAssigns = assignments.filter((a) => a.classId === c.id);
            const classSubs = submissions.filter((s) => s.classId === c.id);
            const avgScore =
              classSubs.length > 0
                ? Math.round(
                    classSubs.reduce((acc, curr) => acc + curr.percentage, 0) /
                      classSubs.length
                  )
                : null;

            return (
              <Card
                key={c.id}
                className="p-5 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded">
                      PIN: {c.code}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(c.code, c.id)}
                        className="h-7 text-[11px] text-slate-400 hover:text-white px-2 gap-1"
                        title="Copy Class Code"
                      >
                        {copiedId === c.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Code</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClass(c.id, c.name)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Delete Class"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                      {c.name}
                    </h3>
                    {c.schedule && (
                      <span className="text-xs text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {c.schedule}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {c.description || "Class group for SAT prep homework drills."}
                  </p>
                </div>

                {/* Class Stats & Homework Actions */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-850">
                      <span className="text-slate-400 text-[10px] block">Homework Sets</span>
                      <span className="font-bold text-white">{classAssigns.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-850">
                      <span className="text-slate-400 text-[10px] block">Submissions</span>
                      <span className="font-bold text-emerald-400">
                        {classSubs.length} {avgScore !== null ? `(${avgScore}%)` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-750 gap-1"
                    >
                      <Link href={`/dashboard/assignments/new?classId=${c.id}`}>
                        <Plus className="h-3.5 w-3.5 text-blue-400" />
                        <span>Assign HW</span>
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Link href={`/dashboard/assignments?classId=${c.id}`}>
                        View HW
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE CLASS DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span>Create New SAT Class</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateClass} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Class Name <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Class 11-B SAT Math or Weekend RW Group"
                className="bg-slate-900 border-slate-700 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Class PIN / Join Code (Optional)</Label>
              <Input
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="e.g. MATH-11B (Leave blank for auto-code)"
                className="bg-slate-900 border-slate-700 text-xs font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Schedule / Meeting Time (Optional)</Label>
              <Input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="e.g. Mon/Wed 10:00 AM"
                className="bg-slate-900 border-slate-700 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description (Optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. High school cohort focusing on Digital SAT Math modules."
                rows={2}
                className="bg-slate-900 border-slate-700 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="text-xs">
                Create Class
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
