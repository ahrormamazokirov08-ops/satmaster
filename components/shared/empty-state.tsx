import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 mb-4 border border-blue-500/20">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="max-w-md text-sm text-slate-400 mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        <>
          {actionHref ? (
            <Button asChild variant="gradient">
              <a href={actionHref}>{actionLabel}</a>
            </Button>
          ) : (
            <Button onClick={onAction} variant="gradient">
              {actionLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
