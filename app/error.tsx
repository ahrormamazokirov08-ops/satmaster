"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/10 text-red-400 mb-6 border border-red-500/20">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-slate-400 mb-8 leading-relaxed">
        {error.message || "An unexpected system error occurred. Our team has been notified."}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => reset()} variant="default" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Return to Dashboard</a>
        </Button>
      </div>
    </div>
  );
}
