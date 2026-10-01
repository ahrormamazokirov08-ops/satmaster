import React from "react";

interface PageHeaderProps {
  heading: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ heading, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          {heading}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
