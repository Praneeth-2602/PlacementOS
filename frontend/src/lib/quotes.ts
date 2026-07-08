const QUOTES = [
  "Consistency beats intensity.",
  "Every problem solved is a step closer to your offer.",
  "Interviewers reward depth, not just breadth.",
  "Your readiness score reflects effort — keep pushing.",
  "Small daily progress compounds into placement success.",
  "Strong fundamentals open doors at every company.",
  "Build in public; let your GitHub tell your story.",
  "Revision is where good solvers become great ones.",
  "Mock interviews reduce real-interview anxiety.",
  "Track opportunities like you track LeetCode problems.",
  "A great resume gets you the interview; preparation wins it.",
  "Focus on weak topics — that's where the gains are.",
  "Streaks are proof of discipline, not luck.",
  "One more medium problem today beats ten tomorrow.",
  "Companies hire problem solvers who communicate clearly.",
  "Your cohort is preparing too — stay ahead.",
  "Deadlines create urgency; systems create results.",
  "Readiness is a journey, not a destination.",
  "Ship projects, not just solve puzzles.",
  "Today's plan is tomorrow's confidence.",
];

export function getDailyQuote(): string {
  const day = new Date().getDate();
  return QUOTES[day % QUOTES.length];
}
