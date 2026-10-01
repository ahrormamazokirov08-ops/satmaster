"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Check,
  Sparkles,
  BookOpen,
  HelpCircle,
  Clock,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Layers,
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
  DialogDescription,
} from "@/components/ui/dialog";
import { satStorage } from "@/lib/storage/sat-storage";
import {
  SATQuestion,
  SATSection,
  SATDomain,
  DifficultyLevel,
  QuestionType,
  SATAssignment,
} from "@/lib/types/sat";
import { toast } from "sonner";

export default function NewAssignmentPage() {
  const router = useRouter();

  // Assignment metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [section, setSection] = useState<SATSection | "mixed">("mixed");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20);
  const [isTimed, setIsTimed] = useState<boolean>(true);
  const [showExplanationsImmediately, setShowExplanationsImmediately] =
    useState<boolean>(true);

  // Selected questions
  const [availableQuestions, setAvailableQuestions] = useState<SATQuestion[]>(
    []
  );
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(
    null
  );

  // Filter bank
  const [bankTab, setBankTab] = useState<"bank" | "custom">("bank");
  const [bankSectionFilter, setBankSectionFilter] = useState<string>("all");
  const [bankDomainFilter, setBankDomainFilter] = useState<string>("all");

  // Custom question form state
  const [customSection, setCustomSection] =
    useState<SATSection>("reading-writing");
  const [customDomain, setCustomDomain] = useState("Standard English Conventions");
  const [customSkill, setCustomSkill] = useState("");
  const [customDifficulty, setCustomDifficulty] =
    useState<DifficultyLevel>("Medium");
  const [customType, setCustomType] = useState<QuestionType>("multiple-choice");
  const [customPassage, setCustomPassage] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [customOptionA, setCustomOptionA] = useState("");
  const [customOptionB, setCustomOptionB] = useState("");
  const [customOptionC, setCustomOptionC] = useState("");
  const [customOptionD, setCustomOptionD] = useState("");
  const [customCorrectMCQ, setCustomCorrectMCQ] = useState<string>("A");
  const [customNumericAnswer, setCustomNumericAnswer] = useState("");
  const [customExplanation, setCustomExplanation] = useState("");

  // Share modal state
  const [createdAssignment, setCreatedAssignment] =
    useState<SATAssignment | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  useEffect(() => {
    const qList = satStorage.getQuestions();
    setAvailableQuestions(qList);
    // Pre-select 3 questions by default for high convenience
    if (qList.length >= 3) {
      setSelectedQuestionIds([qList[0].id, qList[1].id, qList[7]?.id || qList[2].id]);
    }
  }, []);

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) {
      toast.error("Please enter a question prompt");
      return;
    }

    let finalCorrect = customCorrectMCQ;
    let finalOptions = undefined;
    let acceptedAnswers: string[] = [];

    if (customType === "multiple-choice") {
      if (
        !customOptionA.trim() ||
        !customOptionB.trim() ||
        !customOptionC.trim() ||
        !customOptionD.trim()
      ) {
        toast.error("Please fill in all 4 multiple-choice options (A, B, C, D)");
        return;
      }
      finalOptions = [
        { id: "A" as const, text: customOptionA.trim() },
        { id: "B" as const, text: customOptionB.trim() },
        { id: "C" as const, text: customOptionC.trim() },
        { id: "D" as const, text: customOptionD.trim() },
      ];
    } else {
      if (!customNumericAnswer.trim()) {
        toast.error("Please enter the correct numerical or fraction answer");
        return;
      }
      finalCorrect = customNumericAnswer.trim();
      acceptedAnswers = [customNumericAnswer.trim()];
    }

    const newQ: SATQuestion = {
      id: "q-custom-" + Math.random().toString(36).substring(2, 9),
      section: customSection,
      domain: customDomain.trim() || (customSection === "math" ? "Algebra" : "Craft and Structure"),
      skill: customSkill.trim() || "SAT Concept Practice",
      difficulty: customDifficulty,
      passage: customPassage.trim() || undefined,
      prompt: customPrompt.trim(),
      type: customType,
      options: finalOptions,
      correctAnswer: finalCorrect,
      acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : undefined,
      explanation:
        customExplanation.trim() ||
        "The correct answer is substantiated by the text rules or mathematical equation above.",
    };

    satStorage.addQuestion(newQ);
    setAvailableQuestions(satStorage.getQuestions());
    setSelectedQuestionIds((prev) => [...prev, newQ.id]);

    toast.success("Custom question added and included in your assignment!");
    // Reset custom form
    setCustomPrompt("");
    setCustomPassage("");
    setCustomOptionA("");
    setCustomOptionB("");
    setCustomOptionC("");
    setCustomOptionD("");
    setCustomNumericAnswer("");
    setCustomExplanation("");
    setBankTab("bank");
  };

  const handlePublish = () => {
    if (!title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }
    if (selectedQuestionIds.length === 0) {
      toast.error("Please select at least 1 question for your homework");
      return;
    }

    const newAssignment = satStorage.createAssignment({
      title: title.trim(),
      description: description.trim() || undefined,
      section: section,
      questionIds: selectedQuestionIds,
      timeLimitMinutes: isTimed ? timeLimitMinutes : undefined,
      showExplanationsImmediately,
    });

    setCreatedAssignment(newAssignment);
    setShareModalOpen(true);
  };

  const filteredQuestions = availableQuestions.filter((q) => {
    const matchSection =
      bankSectionFilter === "all" || q.section === bankSectionFilter;
    const matchDomain =
      bankDomainFilter === "all" || q.domain === bankDomainFilter;
    return matchSection && matchDomain;
  });

  const uniqueDomains = Array.from(
    new Set(availableQuestions.map((q) => q.domain))
  );

  const getShareUrl = () => {
    if (!createdAssignment) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/hw/${createdAssignment.id}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setLinkCopied(true);
    toast.success("Student link copied to clipboard!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const copyShareText = () => {
    if (!createdAssignment) return;
    const text = `📢 Digital SAT Homework: "${createdAssignment.title}"\n👉 Take test here: ${getShareUrl()}\n🔑 Class Join PIN: ${createdAssignment.code}\nGood luck!`;
    navigator.clipboard.writeText(text);
    setTextCopied(true);
    toast.success("Message copied! Ready to paste into Telegram or WhatsApp.");
    setTimeout(() => setTextCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-400 hover:text-white"
        >
          <Link href="/dashboard/assignments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Create SAT Homework
          </h1>
          <p className="text-sm text-slate-400">
            Pick from pre-loaded Digital SAT questions or write your own custom problems.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Question Picker & Question Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mode Switch Tabs */}
          <div className="flex border-b border-slate-800 gap-4">
            <button
              onClick={() => setBankTab("bank")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                bankTab === "bank"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Select from SAT Question Bank</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0">
                {availableQuestions.length} Available
              </Badge>
            </button>

            <button
              onClick={() => setBankTab("custom")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                bankTab === "custom"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Write Custom SAT Question</span>
            </button>
          </div>

          {/* TAB 1: SAT QUESTION BANK */}
          {bankTab === "bank" && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-400 mr-1">Section:</span>
                  {[
                    { label: "All", val: "all" },
                    { label: "Math", val: "math" },
                    { label: "Reading & Writing", val: "reading-writing" },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setBankSectionFilter(s.val)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        bankSectionFilter === s.val
                          ? "bg-blue-600 text-white font-medium"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Domain:</span>
                  <select
                    value={bankDomainFilter}
                    onChange={(e) => setBankDomainFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1 focus:outline-none"
                  >
                    <option value="all">All Domains</option>
                    {uniqueDomains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions list */}
              <div className="space-y-3">
                {filteredQuestions.map((q, idx) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  const isExpanded = expandedPreviewId === q.id;

                  return (
                    <Card
                      key={q.id}
                      className={`p-4 border transition-all ${
                        isSelected
                          ? "border-blue-500/50 bg-blue-950/20"
                          : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectQuestion(q.id)}
                          className={`mt-1 h-5 w-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "border-slate-700 bg-slate-800 hover:border-slate-500"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </button>

                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={
                                q.section === "math"
                                  ? "border-blue-500/30 text-blue-400 bg-blue-500/10 text-[11px]"
                                  : "border-purple-500/30 text-purple-400 bg-purple-500/10 text-[11px]"
                              }
                            >
                              {q.section === "math"
                                ? "SAT Math"
                                : "Reading & Writing"}
                            </Badge>

                            <Badge
                              variant="secondary"
                              className="text-[11px] bg-slate-800 text-slate-300"
                            >
                              {q.domain}
                            </Badge>

                            <span
                              className={`text-[11px] font-semibold ${
                                q.difficulty === "Easy"
                                  ? "text-emerald-400"
                                  : q.difficulty === "Medium"
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {q.difficulty}
                            </span>

                            {q.type === "student-produced-response" && (
                              <Badge
                                variant="outline"
                                className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]"
                              >
                                Grid-In (SPR)
                              </Badge>
                            )}
                          </div>

                          {/* Passage preview if exists */}
                          {q.passage && (
                            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-serif line-clamp-2">
                              {q.passage}
                            </p>
                          )}

                          <p className="text-sm text-slate-200 font-medium">
                            {q.prompt}
                          </p>

                          {/* Expandable Preview */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPreviewId(isExpanded ? null : q.id)
                              }
                              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                            >
                              <span>
                                {isExpanded ? "Hide Details" : "Preview Options & Answer"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
                                {q.options && (
                                  <div className="space-y-1.5">
                                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                                      Choices:
                                    </span>
                                    {q.options.map((opt) => (
                                      <div
                                        key={opt.id}
                                        className={`flex items-start gap-2 p-2 rounded-lg border ${
                                          opt.id === q.correctAnswer
                                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                            : "border-slate-800 text-slate-300"
                                        }`}
                                      >
                                        <span className="font-bold">
                                          {opt.id}.
                                        </span>
                                        <span>{opt.text}</span>
                                        {opt.id === q.correctAnswer && (
                                          <Badge className="ml-auto bg-emerald-500 text-black font-bold text-[9px] px-1.5 py-0">
                                            CORRECT
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {q.type === "student-produced-response" && (
                                  <div className="p-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                                    <strong>Correct Grid-In Answer:</strong>{" "}
                                    {q.correctAnswer}
                                    {q.acceptedAnswers &&
                                      q.acceptedAnswers.length > 1 && (
                                        <span className="text-slate-400 text-[11px] ml-2">
                                          (Accepts: {q.acceptedAnswers.join(", ")})
                                        </span>
                                      )}
                                  </div>
                                )}

                                <div className="space-y-1 pt-1 border-t border-slate-800">
                                  <span className="font-semibold text-blue-400 uppercase tracking-wider text-[10px]">
                                    Teacher Explanation:
                                  </span>
                                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                                    {q.explanation}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: WRITE CUSTOM QUESTION */}
          {bankTab === "custom" && (
            <Card className="p-6 border-slate-800 bg-slate-900/60">
              <form onSubmit={handleAddCustomQuestion} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    <span>Create Custom SAT Problem</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Saves to question bank automatically
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Section</Label>
                    <select
                      value={customSection}
                      onChange={(e) =>
                        setCustomSection(e.target.value as SATSection)
                      }
                      className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200"
                    >
                      <option value="reading-writing">Reading & Writing</option>
                      <option value="math">SAT Math</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Domain / Topic</Label>
                    <Input
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="e.g. Algebra, Words in Context"
                      className="bg-slate-950 text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Difficulty</Label>
                    <select
                      value={customDifficulty}
                      onChange={(e) =>
                        setCustomDifficulty(e.target.value as DifficultyLevel)
                      }
                      className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Question Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Answer Format</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="qtype"
                        checked={customType === "multiple-choice"}
                        onChange={() => setCustomType("multiple-choice")}
                      />
                      <span>Multiple Choice (A, B, C, D)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="qtype"
                        checked={customType === "student-produced-response"}
                        onChange={() =>
                          setCustomType("student-produced-response")
                        }
                      />
                      <span>Student-Produced Response (Math Grid-In)</span>
                    </label>
                  </div>
                </div>

                {/* Passage / Context */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Passage / Background Text</Label>
                    <span className="text-[10px] text-slate-500">
                      Optional (Standard for Reading & Writing)
                    </span>
                  </div>
                  <Textarea
                    value={customPassage}
                    onChange={(e) => setCustomPassage(e.target.value)}
                    placeholder="Paste the reading excerpt, sentence context, or experiment notes..."
                    rows={3}
                    className="bg-slate-950 text-xs font-serif"
                  />
                </div>

                {/* Question Prompt */}
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Question Stem / Prompt <span className="text-rose-400">*</span>
                  </Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Which choice completes the text with the most logical word? or What is the value of x?"
                    rows={2}
                    className="bg-slate-950 text-xs"
                    required
                  />
                </div>

                {/* MCQ Choices */}
                {customType === "multiple-choice" ? (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Answer Choices
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Select the radio button next to the correct answer
                      </span>
                    </div>

                    {[
                      { id: "A", val: customOptionA, set: setCustomOptionA },
                      { id: "B", val: customOptionB, set: setCustomOptionB },
                      { id: "C", val: customOptionC, set: setCustomOptionC },
                      { id: "D", val: customOptionD, set: setCustomOptionD },
                    ].map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctMcq"
                          checked={customCorrectMCQ === opt.id}
                          onChange={() => setCustomCorrectMCQ(opt.id)}
                          className="h-4 w-4 text-emerald-500 cursor-pointer"
                          title="Mark as correct answer"
                        />
                        <span className="text-xs font-bold text-slate-300 w-4">
                          {opt.id}
                        </span>
                        <Input
                          value={opt.val}
                          onChange={(e) => opt.set(e.target.value)}
                          placeholder={`Option ${opt.id} text...`}
                          className="bg-slate-900 text-xs h-9"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Grid-In Input */
                  <div className="space-y-1.5 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <Label className="text-xs">
                      Correct Numerical / Fraction Answer
                    </Label>
                    <Input
                      value={customNumericAnswer}
                      onChange={(e) => setCustomNumericAnswer(e.target.value)}
                      placeholder="e.g. 2.5 or 5/2 or 220"
                      className="bg-slate-900 text-xs h-9 font-mono"
                    />
                    <p className="text-[11px] text-slate-400">
                      Our auto-grader automatically accepts equivalent fractions
                      and decimals (e.g., both 5/2 and 2.5).
                    </p>
                  </div>
                )}

                {/* Explanation */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Teacher Solution & Explanation</Label>
                  <Textarea
                    value={customExplanation}
                    onChange={(e) => setCustomExplanation(e.target.value)}
                    placeholder="Explain step-by-step why the correct answer is right and why trap answers are wrong..."
                    rows={3}
                    className="bg-slate-950 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Question to Assignment</span>
                </Button>
              </form>
            </Card>
          )}
        </div>

        {/* Right Col: Assignment Settings & Summary */}
        <div className="space-y-6">
          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-5 sticky top-20">
            <div>
              <h3 className="text-base font-bold text-white">
                Assignment Details
              </h3>
              <p className="text-xs text-slate-400">
                Configure settings for this homework set
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Homework Title <span className="text-rose-400">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 4: SAT Math Mastery"
                  className="bg-slate-950 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Instructions / Notes (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Complete before our Thursday session. No calculators on module 1."
                  rows={2}
                  className="bg-slate-950 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Section Category</Label>
                <select
                  value={section}
                  onChange={(e) =>
                    setSection(e.target.value as SATSection | "mixed")
                  }
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="mixed">Mixed SAT Practice</option>
                  <option value="math">SAT Math Only</option>
                  <option value="reading-writing">
                    SAT Reading & Writing Only
                  </option>
                </select>
              </div>

              {/* Timing */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>Time Limit</span>
                  </Label>
                  <label className="text-xs text-slate-400 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTimed}
                      onChange={(e) => setIsTimed(e.target.checked)}
                      className="rounded border-slate-700"
                    />
                    <span>Enable Timer</span>
                  </label>
                </div>

                {isTimed && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={timeLimitMinutes}
                      onChange={(e) =>
                        setTimeLimitMinutes(parseInt(e.target.value) || 0)
                      }
                      min={1}
                      max={120}
                      className="bg-slate-950 text-xs w-24"
                    />
                    <span className="text-xs text-slate-400">minutes</span>
                  </div>
                )}
              </div>

              {/* Instant Explanations */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showExplanationsImmediately}
                    onChange={(e) =>
                      setShowExplanationsImmediately(e.target.checked)
                    }
                    className="mt-0.5 rounded border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Instant Feedback & Explanations
                    </span>
                    <span className="text-[11px] text-slate-400 leading-normal block">
                      Students see their score and step-by-step explanations
                      immediately upon submitting.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Questions Selected Summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Selected Questions:</span>
                <Badge
                  variant="default"
                  className="bg-blue-600 font-bold text-white text-xs px-2"
                >
                  {selectedQuestionIds.length} Questions
                </Badge>
              </div>

              {selectedQuestionIds.length === 0 ? (
                <p className="text-[11px] text-rose-400">
                  Please pick at least one question from the bank or add a custom one.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-400">
                  Ready to assign to your students!
                </p>
              )}
            </div>

            <Button
              onClick={handlePublish}
              variant="gradient"
              className="w-full gap-2 py-6 text-sm font-bold shadow-lg shadow-blue-500/25"
              disabled={selectedQuestionIds.length === 0}
            >
              <Send className="h-4 w-4" />
              <span>Publish & Generate Student Link</span>
            </Button>
          </Card>
        </div>
      </div>

      {/* SHARE MODAL AFTER PUBLISHING */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-lg border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              Homework Published!
            </DialogTitle>
            <DialogDescription className="text-center text-slate-400 text-xs">
              Your students can now access this test immediately without creating an account.
            </DialogDescription>
          </DialogHeader>

          {createdAssignment && (
            <div className="space-y-4 pt-2">
              {/* PIN Code Box */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center space-y-1">
                <span className="text-xs text-amber-300 font-semibold tracking-wide uppercase">
                  Class Join PIN Code
                </span>
                <div className="text-3xl font-mono font-extrabold tracking-wider text-white">
                  {createdAssignment.code}
                </div>
                <p className="text-[11px] text-slate-400">
                  Students can enter this code at{" "}
                  <span className="font-mono text-slate-300">/hw</span>
                </p>
              </div>

              {/* Direct Share Link Box */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Direct Shareable Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={getShareUrl()}
                    className="bg-slate-900 border-slate-700 text-xs font-mono text-blue-300"
                  />
                  <Button
                    variant="outline"
                    onClick={copyShareLink}
                    className="shrink-0 gap-1.5 border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-300" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* WhatsApp / Telegram Message Copy */}
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <span className="font-semibold block text-white">
                    Send to WhatsApp / Telegram
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Includes test title, direct link, and join PIN
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyShareText}
                  className="text-xs h-8 border-slate-700 hover:bg-slate-800"
                >
                  {textCopied ? "Copied!" : "Copy Message"}
                </Button>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-xs gap-1.5"
                >
                  <Link href={`/hw/${createdAssignment.id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                    <span>Test as Student</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="gradient"
                  size="sm"
                  className="text-xs"
                >
                  <Link href={`/dashboard/assignments/${createdAssignment.id}`}>
                    Go to Gradebook
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
