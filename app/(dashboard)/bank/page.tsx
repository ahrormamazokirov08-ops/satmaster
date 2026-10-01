"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Copy,
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
import {
  SATQuestion,
  SATSection,
  DifficultyLevel,
  QuestionType,
} from "@/lib/types/sat";
import { toast } from "sonner";

export default function SATQuestionBankPage() {
  const [questions, setQuestions] = useState<SATQuestion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New question modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSection, setNewSection] = useState<SATSection>("math");
  const [newDomain, setNewDomain] = useState("Algebra");
  const [newSkill, setNewSkill] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>("Medium");
  const [newType, setNewType] = useState<QuestionType>("multiple-choice");
  const [newPassage, setNewPassage] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newOptA, setNewOptA] = useState("");
  const [newOptB, setNewOptB] = useState("");
  const [newOptC, setNewOptC] = useState("");
  const [newOptD, setNewOptD] = useState("");
  const [newCorrectMCQ, setNewCorrectMCQ] = useState("A");
  const [newGridInAnswer, setNewGridInAnswer] = useState("");
  const [newExplanation, setNewExplanation] = useState("");

  useEffect(() => {
    setQuestions(satStorage.getQuestions());
  }, []);

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) {
      toast.error("Please enter a question prompt");
      return;
    }

    let finalCorrect = newCorrectMCQ;
    let finalOptions = undefined;
    let acceptedList: string[] = [];

    if (newType === "multiple-choice") {
      if (!newOptA.trim() || !newOptB.trim() || !newOptC.trim() || !newOptD.trim()) {
        toast.error("Please provide all 4 multiple-choice options");
        return;
      }
      finalOptions = [
        { id: "A" as const, text: newOptA.trim() },
        { id: "B" as const, text: newOptB.trim() },
        { id: "C" as const, text: newOptC.trim() },
        { id: "D" as const, text: newOptD.trim() },
      ];
    } else {
      if (!newGridInAnswer.trim()) {
        toast.error("Please provide the correct numerical answer");
        return;
      }
      finalCorrect = newGridInAnswer.trim();
      acceptedList = [newGridInAnswer.trim()];
    }

    const created: SATQuestion = {
      id: "q-custom-" + Math.random().toString(36).substring(2, 9),
      section: newSection,
      domain: newDomain.trim() || "General Practice",
      skill: newSkill.trim() || "Core Skill",
      difficulty: newDifficulty,
      passage: newPassage.trim() || undefined,
      prompt: newPrompt.trim(),
      type: newType,
      options: finalOptions,
      correctAnswer: finalCorrect,
      acceptedAnswers: acceptedList.length > 0 ? acceptedList : undefined,
      explanation:
        newExplanation.trim() || "Substantiated by standard SAT principles.",
    };

    satStorage.addQuestion(created);
    setQuestions(satStorage.getQuestions());
    setIsModalOpen(false);
    toast.success("New question added to your SAT Question Bank!");

    // Reset
    setNewPrompt("");
    setNewPassage("");
    setNewOptA("");
    setNewOptB("");
    setNewOptC("");
    setNewOptD("");
    setNewGridInAnswer("");
    setNewExplanation("");
  };

  const domains = Array.from(new Set(questions.map((q) => q.domain)));

  const filtered = questions.filter((q) => {
    const matchSearch =
      q.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.skill.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.passage && q.passage.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchSection =
      sectionFilter === "all" || q.section === sectionFilter;
    const matchDomain = domainFilter === "all" || q.domain === domainFilter;
    const matchDiff =
      difficultyFilter === "all" || q.difficulty === difficultyFilter;
    return matchSearch && matchSection && matchDomain && matchDiff;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-blue-400" />
            <span>SAT Question Bank</span>
          </h1>
          <p className="text-sm text-slate-400">
            Curated authentic Digital SAT questions across Math and Reading & Writing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="border-slate-700 bg-slate-800 text-xs"
          >
            <Link href="/dashboard/assignments/new">
              <FileCheck2 className="h-4 w-4 mr-1.5 text-blue-400" />
              <span>Create Homework Set</span>
            </Link>
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            variant="gradient"
            className="gap-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Question</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions by keyword, skill, formula, or passage text..."
            className="pl-9 bg-slate-950 text-sm border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Section Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Section:</span>
            {[
              { label: "All", val: "all" },
              { label: "Reading & Writing", val: "reading-writing" },
              { label: "Math", val: "math" },
            ].map((s) => (
              <button
                key={s.val}
                onClick={() => setSectionFilter(s.val)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  sectionFilter === s.val
                    ? "bg-blue-600 text-white font-medium"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Domain Filter */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400">Domain:</span>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1"
            >
              <option value="all">All Domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Difficulty:</span>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1"
            >
              <option value="all">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question Cards */}
      <div className="text-xs text-slate-400 font-medium">
        Showing {filtered.length} of {questions.length} questions
      </div>

      <div className="space-y-4">
        {filtered.map((q, idx) => {
          const isExpanded = expandedId === q.id;

          return (
            <Card
              key={q.id}
              className="p-5 border-slate-800 bg-slate-900/50 hover:border-slate-750 transition-all space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={
                      q.section === "math"
                        ? "border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs"
                        : "border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs"
                    }
                  >
                    {q.section === "math" ? "SAT Math" : "Reading & Writing"}
                  </Badge>

                  <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                    {q.domain}
                  </Badge>

                  <span
                    className={`text-xs font-semibold ${
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
                      Grid-In
                    </Badge>
                  )}
                </div>

                <span className="text-xs text-slate-500 font-mono">
                  ID: {q.id}
                </span>
              </div>

              {/* Passage if applicable */}
              {q.passage && (
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 font-serif text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {q.passage}
                </div>
              )}

              {/* Prompt */}
              <div className="text-sm font-semibold text-white">
                {q.prompt}
              </div>

              {/* Toggle Answers and Explanations */}
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <span>
                    {isExpanded ? "Hide Answer & Explanation" : "View Answer & Explanation"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 text-xs">
                    {/* Options if MCQ */}
                    {q.options && (
                      <div className="space-y-1.5">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                          Answer Choices:
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
                            <span className="font-bold">{opt.id}.</span>
                            <span>{opt.text}</span>
                            {opt.id === q.correctAnswer && (
                              <Badge className="ml-auto bg-emerald-500 text-black font-bold text-[9px]">
                                CORRECT
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === "student-produced-response" && (
                      <div className="p-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                        <strong>Correct Answer:</strong> {q.correctAnswer}
                        {q.acceptedAnswers && q.acceptedAnswers.length > 1 && (
                          <span className="text-slate-400 text-xs ml-2">
                            (Also accepts: {q.acceptedAnswers.join(", ")})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Step-by-step teacher explanation */}
                    <div className="space-y-1 pt-2 border-t border-slate-800">
                      <span className="font-semibold text-blue-400 uppercase tracking-wider text-[10px]">
                        Teacher Solution & Strategy:
                      </span>
                      <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE QUESTION MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Add Question to Bank
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateQuestion} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Section</Label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value as SATSection)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-slate-200"
                >
                  <option value="math">SAT Math</option>
                  <option value="reading-writing">SAT Reading & Writing</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Domain</Label>
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g. Algebra, Information and Ideas"
                  className="bg-slate-900 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Specific Skill / Topic</Label>
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="e.g. Systems of linear equations"
                  className="bg-slate-900 text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Difficulty</Label>
                <select
                  value={newDifficulty}
                  onChange={(e) =>
                    setNewDifficulty(e.target.value as DifficultyLevel)
                  }
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-slate-200"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Question Format</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    checked={newType === "multiple-choice"}
                    onChange={() => setNewType("multiple-choice")}
                  />
                  <span>Multiple Choice (A, B, C, D)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    checked={newType === "student-produced-response"}
                    onChange={() => setNewType("student-produced-response")}
                  />
                  <span>Student-Produced Response (Grid-In)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Passage / Reading Context (Optional)</Label>
              <Textarea
                value={newPassage}
                onChange={(e) => setNewPassage(e.target.value)}
                placeholder="Reading passage or word problem background..."
                rows={2}
                className="bg-slate-900 text-xs font-serif"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Question Prompt <span className="text-rose-400">*</span>
              </Label>
              <Textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="What is the value of x? or Which choice completes..."
                rows={2}
                className="bg-slate-900 text-xs"
                required
              />
            </div>

            {newType === "multiple-choice" ? (
              <div className="space-y-2 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">
                  Choices (Select correct radio):
                </span>
                {[
                  { id: "A", val: newOptA, set: setNewOptA },
                  { id: "B", val: newOptB, set: setNewOptB },
                  { id: "C", val: newOptC, set: setNewOptC },
                  { id: "D", val: newOptD, set: setNewOptD },
                ].map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="newCorrectMcq"
                      checked={newCorrectMCQ === opt.id}
                      onChange={() => setNewCorrectMCQ(opt.id)}
                    />
                    <span className="font-bold text-xs w-4">{opt.id}</span>
                    <Input
                      value={opt.val}
                      onChange={(e) => opt.set(e.target.value)}
                      placeholder={`Option ${opt.id}...`}
                      className="bg-slate-950 text-xs h-8"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <Label className="text-xs">Correct Numerical Answer</Label>
                <Input
                  value={newGridInAnswer}
                  onChange={(e) => setNewGridInAnswer(e.target.value)}
                  placeholder="e.g. 2.5 or 5/2"
                  className="bg-slate-950 text-xs h-8 font-mono"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Step-by-Step Teacher Explanation</Label>
              <Textarea
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
                placeholder="Explain the strategy and why other choices fail..."
                rows={2}
                className="bg-slate-900 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
                Save to Bank
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
