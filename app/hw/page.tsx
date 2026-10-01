"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  KeyRound,
  User,
  Clock,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { satStorage } from "@/lib/storage/sat-storage";
import { SATAssignment } from "@/lib/types/sat";
import { toast } from "sonner";

export default function StudentPortalEntryPage() {
  const router = useRouter();
  const [pinCode, setPinCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [assignments, setAssignments] = useState<SATAssignment[]>([]);

  useEffect(() => {
    setAssignments(satStorage.getAssignments());
    const savedName = localStorage.getItem("satflow_student_name");
    if (savedName) setStudentName(savedName);
  }, []);

  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) {
      toast.error("Please enter your assignment PIN code");
      return;
    }
    if (!studentName.trim()) {
      toast.error("Please enter your name so your teacher knows who submitted");
      return;
    }

    localStorage.setItem("satflow_student_name", studentName.trim());

    const found = satStorage.getAssignmentByCode(pinCode.trim());
    if (found) {
      router.push(`/hw/${found.id}`);
    } else {
      toast.error("Assignment PIN not found. Please verify the code with your teacher.");
    }
  };

  const handleSelectAssignment = (assignId: string) => {
    if (!studentName.trim()) {
      toast.error("Please type your name above before starting");
      return;
    }
    localStorage.setItem("satflow_student_name", studentName.trim());
    router.push(`/hw/${assignId}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="w-full max-w-md space-y-6">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            Digital SAT Student Homework
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Start Your Assignment
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            No password required. Enter your name and assignment code to take your Digital SAT practice set.
          </p>
        </div>

        {/* PIN Entry Card */}
        <Card className="p-6 border-slate-800 bg-slate-900/70 shadow-2xl space-y-5">
          <form onSubmit={handleJoinByPin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-400" />
                <span>Your Full Name</span>
              </Label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="bg-slate-950 text-sm h-10 border-slate-700"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>Assignment PIN Code</span>
              </Label>
              <Input
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                placeholder="e.g. MATH-01 or SAT-402"
                className="bg-slate-950 text-sm h-10 border-slate-700 font-mono tracking-wider uppercase placeholder:normal-case placeholder:font-sans"
              />
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full gap-2 py-5 font-bold shadow-lg shadow-blue-500/20 text-sm"
            >
              <span>Begin SAT Homework</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        {/* Quick Launch Active Homework Sets */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
              Or Pick An Available Set:
            </span>
            <span className="text-[11px]">Click to start</span>
          </div>

          <div className="space-y-2.5">
            {assignments.map((a) => (
              <div
                key={a.id}
                onClick={() => handleSelectAssignment(a.id)}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-blue-500/50 hover:bg-slate-850 cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400"
                    >
                      {a.section === "math" ? "Math" : a.section === "reading-writing" ? "Reading/Writing" : "Mixed"}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {a.code}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {a.title}
                  </h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>{a.questionIds.length} Questions</span>
                    {a.timeLimitMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {a.timeLimitMinutes} mins
                      </span>
                    )}
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
