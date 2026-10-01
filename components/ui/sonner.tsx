"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "dark" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-100 group-[.toaster]:border-slate-800 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-slate-400",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:text-slate-300",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
