import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SATMaster — Digital SAT Homework & Auto-Grading Suite for Teachers",
  description:
    "The effortless way for SAT tutors and teachers to assign homework, share 1-click links with students, and get auto-graded analytics and mistake heatmaps in real-time.",
  keywords: [
    "SAT teacher software",
    "Digital SAT homework",
    "SAT question bank",
    "SAT auto grader",
    "College Board SAT prep",
    "SAT tutor tools",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.variable} font-sans min-h-screen bg-slate-950 text-slate-100 antialiased`}
      >
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
