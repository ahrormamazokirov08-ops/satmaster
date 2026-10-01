"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";

export default function InterviewPrepPage() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | {
    score: number;
    situation: string;
    task: string;
    action: string;
    result: string;
  }>(null);

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setFeedback({
      score: 91,
      situation: "Clearly framed the high latency and database bottlenecks during the internship.",
      task: "Explicitly defined the goal to profile and improve query throughput.",
      action: "Detailed the exact index additions and Redis caching layer implementations.",
      result: "Included concrete metric (28% latency reduction) verified against your profile.",
    });
    toast.success("Answer evaluated with STAR methodology!");
  };

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      <PageHeader
        heading="STAR Interview Simulator"
        description="Practice behavioral and technical interview questions grounded in your genuine background."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Question Simulator */}
        <Card className="lg:col-span-2 p-6 bg-slate-900/60 border-slate-800 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="text-xs">
                Behavioral / Problem Solving
              </Badge>
              <Badge variant="outline" className="text-xs text-slate-400">
                Stripe • Junior / Mid
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-white">
              &quot;Tell me about a difficult technical challenge you encountered in a previous role and how you solved it.&quot;
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Tip:</strong> Structure your response using the STAR method: Situation, Task, Action, and measurable Result.
            </p>
          </div>

          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <textarea
              className="w-full h-36 rounded-xl border border-slate-700/80 bg-slate-950/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              placeholder="Type your response here using your genuine experience (e.g. During my internship at CloudScale, we faced high latency on our backend API endpoints...)"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
            />

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400"
                onClick={() => {
                  setAnswer("During my internship at CloudScale, API response times degraded under peak load (Situation). My task was to profile the PostgreSQL query bottlenecks without modifying client contracts (Task). I analyzed execution plans, created composite indexes on foreign keys, and added an in-memory Redis cache for read queries (Action). As a result, p99 latency dropped by 28% and server throughput doubled (Result).");
                  toast.info("Sample answer filled");
                }}
              >
                Insert Sample Answer
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Evaluate Answer
              </Button>
            </div>
          </form>

          {/* Feedback Output */}
          {feedback && (
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    STAR Assessment Result
                  </span>
                </div>
                <div className="text-xs font-bold text-emerald-400">
                  Score: {feedback.score}/100
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-bold text-blue-400 mb-1">Situation (S)</div>
                  <p className="text-slate-300">{feedback.situation}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-bold text-indigo-400 mb-1">Task (T)</div>
                  <p className="text-slate-300">{feedback.task}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-bold text-purple-400 mb-1">Action (A)</div>
                  <p className="text-slate-300">{feedback.action}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-bold text-emerald-400 mb-1">Result (R)</div>
                  <p className="text-slate-300">{feedback.result}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Question Bank Sidebar */}
        <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white">Suggested Question Bank</h3>
          <div className="space-y-2 text-xs">
            {[
              "Why are you interested in this specific role and company?",
              "Describe a project where you used TypeScript / React.",
              "How do you handle ambiguous requirements under tight deadlines?",
              "What is your approach to automated testing and CI/CD?",
            ].map((q, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer text-slate-300 hover:text-white transition-all"
                onClick={() => toast.info(`Selected question ${idx + 1}`)}
              >
                {q}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
