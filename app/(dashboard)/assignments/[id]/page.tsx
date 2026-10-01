"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  BookOpen,
  Sparkles,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { satStorage } from "@/lib/storage/sat-storage";
import {
  SATAssignment,
  SATQuestion,
  SATSubmission,
} from "@/lib/types/sat";
import { toast } from "sonner";

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [assignment, setAssignment] = useState<SATAssignment | null>(null);
  const [questions, setQuestions] = useState<SATQuestion[]>([]);
  const [submissions, setSubmissions] = useState<SATSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SATSubmission | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [teacherNote, setTeacherNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!id) return;
    const a = satStorage.getAssignmentById(id);
    if (!a) {
      toast.error("Assignment not found");
      router.push("/dashboard/assignments");
      return;
    }
    setAssignment(a);

    // Get questions for this assignment
    const allQ = satStorage.getQuestions();
    const filteredQ = a.questionIds
      .map((qid) => allQ.find((q) => q.id === qid))
      .filter((q): q is SATQuestion => Boolean(q));
    setQuestions(filteredQ);

    // Get submissions for this assignment
    const subs = satStorage.getSubmissions(id);
    setSubmissions(subs);
  }, [id, router]);

  if (!assignment) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading assignment details...
      </div>
    );
  }

  // Compute metrics
  const totalSubmissions = submissions.length;
  const avgScore =
    totalSubmissions > 0
      ? Math.round(
          submissions.reduce((acc, c) => acc + c.percentage, 0) /
            totalSubmissions
        )
      : 0;

  const maxScore =
    totalSubmissions > 0
      ? Math.max(...submissions.map((s) => s.percentage))
      : 0;
  const minScore =
    totalSubmissions > 0
      ? Math.min(...submissions.map((s) => s.percentage))
      : 0;

  const avgTimeSeconds =
    totalSubmissions > 0
      ? Math.round(
          submissions.reduce((acc, c) => acc + c.timeSpentSeconds, 0) /
            totalSubmissions
        )
      : 0;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  // Compute question error rates for the Trouble Spots Heatmap
  const questionStats = questions.map((q) => {
    let correctCount = 0;
    const answerDistribution: Record<string, number> = {};

    submissions.forEach((sub) => {
      const studentAns = sub.answers[q.id];
      if (studentAns) {
        answerDistribution[studentAns] =
          (answerDistribution[studentAns] || 0) + 1;
      }
      if (sub.results[q.id]?.isCorrect) {
        correctCount++;
      }
    });

    const accuracy =
      totalSubmissions > 0
        ? Math.round((correctCount / totalSubmissions) * 100)
        : 100;

    return {
      question: q,
      correctCount,
      accuracy,
      answerDistribution,
    };
  });

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/hw/${assignment.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Student link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInspectStudent = (sub: SATSubmission) => {
    setSelectedSubmission(sub);
    setTeacherNote(sub.teacherFeedback || "");
    setInspectModalOpen(true);
  };

  const handleSaveTeacherFeedback = () => {
    if (!selectedSubmission) return;
    satStorage.updateTeacherFeedback(selectedSubmission.id, teacherNote);
    // Refresh submissions
    setSubmissions(satStorage.getSubmissions(id));
    setSelectedSubmission((prev) =>
      prev ? { ...prev, teacherFeedback: teacherNote } : null
    );
    toast.success("Feedback saved for student!");
  };

  const filteredSubmissions = submissions.filter((s) =>
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
            >
              <Link href="/dashboard/assignments">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

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

            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded">
              PIN: {assignment.code}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {assignment.title}
          </h1>

          <p className="text-xs text-slate-400 max-w-2xl">
            {assignment.description || "Digital SAT homework assignment."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-xs gap-1.5"
          >
            {copied ? (
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
            className="border border-slate-800 text-xs text-blue-400 hover:text-white"
          >
            <Link href={`/hw/${assignment.id}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Student View
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400">Total Submissions</div>
          <div className="text-2xl font-bold text-white mt-1">
            {totalSubmissions}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {assignment.questionIds.length} questions each
          </p>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400">Class Average</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {avgScore}%
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Auto-graded on submit
          </p>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400">Score Spread</div>
          <div className="text-2xl font-bold text-white mt-1">
            {minScore}% - {maxScore}%
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Lowest to highest</p>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400">Avg Completion Time</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {formatTime(avgTimeSeconds)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {assignment.timeLimitMinutes
              ? `Limit: ${assignment.timeLimitMinutes}m`
              : "Untimed"}
          </p>
        </Card>
      </div>

      {/* QUESTION DIFFICULTY HEATMAP & DIAGNOSTICS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span>Question-by-Question Trouble Spots</span>
            </h2>
            <p className="text-xs text-slate-400">
              Identify exactly which questions caused students the most trouble
              to prioritize your next lesson review.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questionStats.map((item, idx) => {
            const isTrouble = item.accuracy < 60 && totalSubmissions > 0;

            return (
              <Card
                key={item.question.id}
                className={`p-4 border transition-all ${
                  isTrouble
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-slate-800 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Question #{idx + 1}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      isTrouble
                        ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                        : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    }`}
                  >
                    {item.accuracy}% Correct
                  </Badge>
                </div>

                <div className="mt-2 text-xs font-semibold text-white">
                  {item.question.skill}
                </div>

                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {item.question.prompt}
                </p>

                {isTrouble && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>High Error Rate — Review in next class!</span>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    Answer:{" "}
                    <strong className="text-emerald-400">
                      {item.question.correctAnswer}
                    </strong>
                  </span>
                  <span className="text-slate-500">{item.question.domain}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* STUDENT SUBMISSIONS TABLE */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span>Student Submissions ({submissions.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Click any student to inspect their detailed answers and leave custom notes.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student name..."
              className="pl-8 h-8 text-xs bg-slate-900 border-slate-800"
            />
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <Card className="p-8 text-center border-slate-800 bg-slate-900/40">
            <p className="text-xs text-slate-400">
              No submissions match your search.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Time Spent</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Teacher Feedback</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSubmissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-850/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {sub.studentName}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white">
                      {sub.score} / {sub.totalQuestions}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[11px] ${
                          sub.percentage >= 80
                            ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                            : sub.percentage >= 60
                            ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                            : "border-rose-500/40 text-rose-400 bg-rose-500/10"
                        }`}
                      >
                        {sub.percentage}%
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {formatTime(sub.timeSpentSeconds)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(sub.submittedAt).toLocaleTimeString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-400">
                      {sub.teacherFeedback ? (
                        <span className="text-blue-300">
                          {sub.teacherFeedback}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">None yet</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInspectStudent(sub)}
                        className="h-7 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-blue-400"
                      >
                        Review Answers
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STUDENT SUBMISSION INSPECTOR MODAL */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>{selectedSubmission?.studentName}’s Submission</span>
              {selectedSubmission && (
                <Badge
                  className={
                    selectedSubmission.percentage >= 80
                      ? "bg-emerald-500 text-black font-bold"
                      : "bg-amber-500 text-black font-bold"
                  }
                >
                  {selectedSubmission.score} / {selectedSubmission.totalQuestions}{" "}
                  ({selectedSubmission.percentage}%)
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6 pt-3">
              {/* Question Breakdown List */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Detailed Answers & Corrections
                </span>

                {questions.map((q, idx) => {
                  const studentAns = selectedSubmission.answers[q.id];
                  const result = selectedSubmission.results[q.id];
                  const isCorrect = result?.isCorrect;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border space-y-2 ${
                        isCorrect
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-rose-500/20 bg-rose-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">
                          Question #{idx + 1} ({q.skill})
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCorrect ? (
                            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" /> Correct
                            </span>
                          ) : (
                            <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                              <XCircle className="h-4 w-4" /> Incorrect
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-200">{q.prompt}</p>

                      <div className="flex items-center gap-4 text-xs pt-1">
                        <div>
                          <span className="text-slate-400">Student picked: </span>
                          <strong
                            className={
                              isCorrect ? "text-emerald-400" : "text-rose-400"
                            }
                          >
                            {studentAns || "(No Answer)"}
                          </strong>
                        </div>

                        {!isCorrect && (
                          <div>
                            <span className="text-slate-400">
                              Correct answer:{" "}
                            </span>
                            <strong className="text-emerald-400">
                              {q.correctAnswer}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Explanation */}
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                        <strong className="text-blue-400 block mb-0.5">
                          Explanation:
                        </strong>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Teacher Feedback Note Box */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                  <span>Personal Feedback for {selectedSubmission.studentName}</span>
                </label>
                <Textarea
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="e.g. Great job on the geometry, but let's review exponent rules before the next test..."
                  rows={2}
                  className="bg-slate-950 text-xs"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={handleSaveTeacherFeedback}
                    className="text-xs"
                  >
                    Save Feedback
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
