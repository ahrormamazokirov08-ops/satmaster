"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  Strikethrough,
  RotateCcw,
  ArrowRight,
  FileCheck,
  AlertCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { satStorage, gradeAnswer } from "@/lib/storage/sat-storage";
import {
  SATAssignment,
  SATQuestion,
  SATSubmission,
  QuestionResult,
} from "@/lib/types/sat";
import { toast } from "sonner";

export default function StudentHomeworkRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [assignment, setAssignment] = useState<SATAssignment | null>(null);
  const [questions, setQuestions] = useState<SATQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student details & testing state
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [eliminated, setEliminated] = useState<Record<string, string[]>>({});
  const [isEliminateMode, setIsEliminateMode] = useState(false);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [showTimer, setShowTimer] = useState(true);

  // Submission & Results
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<SATSubmission | null>(
    null
  );

  // Name prompt modal if missing
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [inputName, setInputName] = useState("");

  useEffect(() => {
    if (!id) return;
    const a = satStorage.getAssignmentById(id);
    if (!a) {
      toast.error("Assignment not found");
      router.push("/hw");
      return;
    }
    setAssignment(a);

    const allQ = satStorage.getQuestions();
    const orderedQ = a.questionIds
      .map((qid) => allQ.find((q) => q.id === qid))
      .filter((q): q is SATQuestion => Boolean(q));
    setQuestions(orderedQ);

    // Check student name
    const storedName = localStorage.getItem("satflow_student_name");
    if (storedName && storedName.trim()) {
      setStudentName(storedName);
    } else {
      setNameModalOpen(true);
    }

    // Set initial timer if timed
    if (a.timeLimitMinutes && a.timeLimitMinutes > 0) {
      setSecondsRemaining(a.timeLimitMinutes * 60);
    }
  }, [id, router]);

  // Timer Tick
  useEffect(() => {
    if (submittedResult) return;

    const timer = setInterval(() => {
      setTimeSpentSeconds((prev) => prev + 1);

      if (secondsRemaining !== null) {
        setSecondsRemaining((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            // Auto-submit when time expires
            handleFinalSubmit();
            toast.warning("Time has expired! Submitting your answers...");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, submittedResult]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    localStorage.setItem("satflow_student_name", inputName.trim());
    setStudentName(inputName.trim());
    setNameModalOpen(false);
  };

  const currentQ = questions[currentIndex];

  const handleSelectMCQ = (optionId: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }));
  };

  const handleGridInChange = (val: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: val,
    }));
  };

  const toggleFlag = () => {
    if (!currentQ) return;
    setFlagged((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const toggleEliminateOption = (optId: string) => {
    if (!currentQ) return;
    const currentList = eliminated[currentQ.id] || [];
    if (currentList.includes(optId)) {
      setEliminated((prev) => ({
        ...prev,
        [currentQ.id]: currentList.filter((x) => x !== optId),
      }));
    } else {
      setEliminated((prev) => ({
        ...prev,
        [currentQ.id]: [...currentList, optId],
      }));
    }
  };

  const handleFinalSubmit = () => {
    if (!assignment) return;

    let score = 0;
    const results: Record<string, QuestionResult> = {};

    questions.forEach((q) => {
      const studentAns = answers[q.id] || "";
      const isCorrect = gradeAnswer(q, studentAns);
      if (isCorrect) score++;

      results[q.id] = {
        questionId: q.id,
        isCorrect,
        studentAnswer: studentAns,
        correctAnswer: q.correctAnswer,
      };
    });

    const totalQuestions = questions.length;
    const percentage =
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    const submission: SATSubmission = {
      id: "sub-" + Math.random().toString(36).substring(2, 9),
      assignmentId: assignment.id,
      studentName: studentName || "Guest Student",
      submittedAt: new Date().toISOString(),
      timeSpentSeconds,
      answers,
      results,
      score,
      totalQuestions,
      percentage,
    };

    satStorage.saveSubmission(submission);
    setSubmittedResult(submission);
    setIsSubmitModalOpen(false);
    toast.success("Homework submitted and auto-graded!");
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] && answers[k].trim() !== ""
  ).length;

  if (!assignment || questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
        Loading test session...
      </div>
    );
  }

  // ========================================================
  // VIEW: AFTER SUBMISSION (AUTO-GRADED RESULTS & REVIEW)
  // ========================================================
  if (submittedResult) {
    const isPassing = submittedResult.percentage >= 70;

    return (
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8 pb-20">
        {/* Score Header Card */}
        <div className="p-6 md:p-8 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 text-center space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            Digital SAT Homework Report
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Great Effort, {submittedResult.studentName}!
          </h1>

          <p className="text-xs sm:text-sm text-slate-400">
            Assignment: <strong className="text-white">{assignment.title}</strong>
          </p>

          {/* Big Score Box */}
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[120px]">
              <span className="text-xs text-slate-400 uppercase font-semibold">
                Score
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                {submittedResult.score} / {submittedResult.totalQuestions}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[120px]">
              <span className="text-xs text-slate-400 uppercase font-semibold">
                Accuracy
              </span>
              <div
                className={`text-3xl sm:text-4xl font-black mt-1 ${
                  isPassing ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {submittedResult.percentage}%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[120px]">
              <span className="text-xs text-slate-400 uppercase font-semibold">
                Time Spent
              </span>
              <div className="text-3xl sm:text-4xl font-black text-indigo-400 mt-1">
                {formatTimer(submittedResult.timeSpentSeconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Solutions & Step-by-Step Explanations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Question Review & Explanations
              </h2>
              <p className="text-xs text-slate-400">
                Review your answers below with detailed SAT teacher explanations.
              </p>
            </div>
            <Badge variant="outline" className="border-slate-800 text-slate-400">
              {questions.length} Questions
            </Badge>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const res = submittedResult.results[q.id];
              const isCorrect = res?.isCorrect;
              const studentAnswer = submittedResult.answers[q.id];

              return (
                <Card
                  key={q.id}
                  className={`p-5 border space-y-4 transition-all ${
                    isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-rose-500/30 bg-rose-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Question #{idx + 1} • {q.domain}
                    </span>
                    <Badge
                      className={`text-xs font-bold ${
                        isCorrect
                          ? "bg-emerald-500 text-black"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {isCorrect ? "Correct (+1)" : "Incorrect (0)"}
                    </Badge>
                  </div>

                  {q.passage && (
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-serif leading-relaxed text-slate-300 whitespace-pre-line">
                      {q.passage}
                    </div>
                  )}

                  <div className="text-sm font-semibold text-white">
                    {q.prompt}
                  </div>

                  {/* Options with markers */}
                  {q.options ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const isStudentPick = studentAnswer === opt.id;
                        const isCorrectPick = q.correctAnswer === opt.id;

                        let style = "border-slate-800 bg-slate-950/50 text-slate-400";
                        if (isCorrectPick) {
                          style =
                            "border-emerald-500/50 bg-emerald-500/10 text-emerald-200 font-medium";
                        } else if (isStudentPick && !isCorrectPick) {
                          style =
                            "border-rose-500/50 bg-rose-500/10 text-rose-200 line-through";
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${style}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold w-5">{opt.id}.</span>
                              <span>{opt.text}</span>
                            </div>
                            {isCorrectPick && (
                              <Badge className="bg-emerald-500 text-black text-[10px] font-bold">
                                Correct Answer
                              </Badge>
                            )}
                            {isStudentPick && !isCorrectPick && (
                              <Badge className="bg-rose-500 text-white text-[10px] font-bold">
                                Your Choice
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Grid In Review */
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                      <div>
                        <span className="text-slate-400">Your Answer: </span>
                        <strong
                          className={
                            isCorrect ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {studentAnswer || "(Left Blank)"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Correct Answer: </span>
                        <strong className="text-emerald-400">
                          {q.correctAnswer}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Step-by-Step Solution */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <strong className="text-blue-400 block font-semibold">
                      Explanation:
                    </strong>
                    <p className="whitespace-pre-line leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-center gap-3 pt-6">
            <Button asChild variant="outline" className="border-slate-700 text-xs">
              <Link href="/hw">Return to Homework Portal</Link>
            </Button>
            <Button
              variant="gradient"
              onClick={() => {
                setSubmittedResult(null);
                setAnswers({});
                setFlagged({});
                setCurrentIndex(0);
              }}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retake Practice Set</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW: ACTIVE DIGITAL SAT TEST RUNNER
  // ========================================================
  const currentEliminated = (currentQ && eliminated[currentQ.id]) || [];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top Test Sub-Header: Title, Question Nav Pills, Timer, Review Button */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/60 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <span className="text-xs font-bold text-white shrink-0 hidden md:inline">
            {assignment.title}
          </span>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* Question Nav Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = Boolean(answers[q.id]?.trim());
              const isQFlagged = Boolean(flagged[q.id]);

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative h-7 w-7 rounded-md text-xs font-bold flex items-center justify-center transition-all ${
                    isCurrent
                      ? "ring-2 ring-blue-500 bg-blue-600 text-white"
                      : isAnswered
                      ? "bg-slate-800 text-slate-200 border border-blue-500/40"
                      : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
                  }`}
                  title={`Question ${idx + 1}`}
                >
                  <span>{idx + 1}</span>
                  {isQFlagged && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-slate-950" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Timer & Submit */}
        <div className="flex items-center gap-3 shrink-0">
          {secondsRemaining !== null && (
            <div className="flex items-center gap-2">
              {showTimer && (
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-200">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              )}
              <button
                onClick={() => setShowTimer(!showTimer)}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline hidden sm:inline"
              >
                {showTimer ? "Hide" : "Show"}
              </button>
            </div>
          )}

          <Button
            onClick={() => setIsSubmitModalOpen(true)}
            variant="gradient"
            size="sm"
            className="text-xs gap-1.5 h-8 font-semibold shadow-sm"
          >
            <span>Submit HW</span>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main Question Display Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto h-full flex flex-col justify-between space-y-6">
          {/* Question Tools Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] border-slate-800 text-slate-400"
              >
                {currentQ.domain}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {/* Strike-through elimination tool */}
              {currentQ.type === "multiple-choice" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEliminateMode(!isEliminateMode)}
                  className={`h-7 text-xs border-slate-800 gap-1 ${
                    isEliminateMode
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Cross out options you know are incorrect"
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Eliminate Choice</span>
                </Button>
              )}

              {/* Flag for Review */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFlag}
                className={`h-7 text-xs border-slate-800 gap-1 ${
                  flagged[currentQ.id]
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {flagged[currentQ.id] ? "Flagged" : "Flag for Review"}
                </span>
              </Button>
            </div>
          </div>

          {/* Reading/Writing Split Screen vs Math Focus View */}
          <div
            className={`grid gap-6 ${
              currentQ.passage ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {/* Left: Passage (if available) */}
            {currentQ.passage && (
              <Card className="p-6 border-slate-800 bg-slate-900/50 rounded-2xl overflow-y-auto max-h-[500px]">
                <div className="font-serif text-sm sm:text-base leading-relaxed text-slate-200 whitespace-pre-line selection:bg-yellow-500/30">
                  {currentQ.passage}
                </div>
              </Card>
            )}

            {/* Right / Centered: Question Prompt & Choices */}
            <div className="space-y-6">
              <div className="text-base sm:text-lg font-semibold text-white leading-snug">
                {currentQ.prompt}
              </div>

              {/* Multiple Choice Options */}
              {currentQ.type === "multiple-choice" && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((opt) => {
                    const isSelected = answers[currentQ.id] === opt.id;
                    const isStruck = currentEliminated.includes(opt.id);

                    return (
                      <div key={opt.id} className="relative flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (isEliminateMode) {
                              toggleEliminateOption(opt.id);
                            } else {
                              handleSelectMCQ(opt.id);
                            }
                          }}
                          className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-start gap-3.5 ${
                            isSelected
                              ? "border-blue-500 bg-blue-600/15 text-white ring-1 ring-blue-500/50"
                              : isStruck
                              ? "border-slate-850 bg-slate-950/40 text-slate-600 line-through opacity-60"
                              : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700 hover:bg-slate-850/80"
                          }`}
                        >
                          <span
                            className={`h-6 w-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isSelected
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "border-slate-700 text-slate-400"
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="pt-0.5 leading-relaxed">
                            {opt.text}
                          </span>
                        </button>

                        {/* Strikethrough mini button on hover */}
                        <button
                          type="button"
                          onClick={() => toggleEliminateOption(opt.id)}
                          className="absolute right-3 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 text-[10px]"
                          title="Cross out"
                        >
                          <Strikethrough className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Student Produced Response (Grid-In Numeric Input) */}
              {currentQ.type === "student-produced-response" && (
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300">
                      Student-Produced Response (SPR)
                    </span>
                    <p className="text-xs text-slate-400">
                      Enter your numeric answer as a decimal or fraction (e.g., 2.5 or 5/2):
                    </p>
                  </div>

                  <Input
                    value={answers[currentQ.id] || ""}
                    onChange={(e) => handleGridInChange(e.target.value)}
                    placeholder="Enter answer..."
                    className="bg-slate-950 border-slate-700 text-lg font-mono tracking-wide h-12 max-w-xs text-white"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="text-xs border-slate-800 text-slate-300 gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            <span className="text-xs text-slate-500">
              {answeredCount} of {questions.length} answered
            </span>

            {currentIndex < questions.length - 1 ? (
              <Button
                variant="gradient"
                size="sm"
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(questions.length - 1, prev + 1)
                  )
                }
                className="text-xs gap-1.5"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setIsSubmitModalOpen(true)}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
              >
                <span>Review & Submit</span>
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SUBMISSION CONFIRMATION MODAL */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Ready to submit your homework?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Please review your completion status before finalizing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Answered Questions:</span>
                <strong className="text-emerald-400">
                  {answeredCount} / {questions.length}
                </strong>
              </div>

              {answeredCount < questions.length && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 pt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    You have {questions.length - answeredCount} unanswered
                    question(s).
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Once submitted, your answers will be auto-graded and sent directly
              to your teacher’s gradebook.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-xs text-slate-400"
              >
                Keep Working
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={handleFinalSubmit}
                className="text-xs"
              >
                Confirm & Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* STUDENT NAME PROMPT MODAL (IF STUDENT OPENED DIRECT LINK) */}
      <Dialog open={nameModalOpen} onOpenChange={setNameModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              <span>Enter Your Name</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Your teacher will see this name on the homework gradebook.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveName} className="space-y-4 pt-2">
            <Input
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="e.g. David Kim"
              className="bg-slate-900 border-slate-700 text-sm"
              autoFocus
              required
            />
            <Button type="submit" variant="gradient" className="w-full text-xs py-4">
              Start Test
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
