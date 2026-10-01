"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorCardProps {
  error?: Error;
  reset?: () => void;
  title?: string;
  message?: string;
}

export function ErrorCard({
  error,
  reset,
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this section.",
}: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-950/20 p-8 text-center backdrop-blur-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20 text-red-400 mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="max-w-md text-sm text-slate-400 mb-6">
        {error?.message || message}
      </p>
      {reset && (
        <Button onClick={reset} variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
