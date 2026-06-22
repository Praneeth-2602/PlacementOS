import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import { getReadinessScores } from "./actions";
import { calculateReadiness } from "@/lib/readiness";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlacementOS",
  description: "Advanced dashboard, LeetCode integration, readiness engine, and offer deadline tracker.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const scores = await getReadinessScores();
  const readiness = calculateReadiness(
    scores.dsaScore,
    scores.csScore,
    scores.resumeScore,
    scores.projectsScore,
    scores.interviewScore
  );

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        <Sidebar 
          currentScore={readiness.score} 
          currentStatus={readiness.status}
          colorClass={readiness.colorClass}
        />
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
