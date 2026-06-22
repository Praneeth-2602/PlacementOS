export interface ReadinessCalculation {
  score: number;
  status: "Developing" | "Competitive" | "Ready";
  colorClass: string;
  breakdown: {
    dsa: number;
    cs: number;
    resume: number;
    projects: number;
    interview: number;
  };
}

export function calculateReadiness(
  dsa: number,
  cs: number,
  resume: number,
  projects: number,
  interview: number
): ReadinessCalculation {
  const dsaWeighted = dsa * 0.40;
  const csWeighted = cs * 0.25;
  const resumeWeighted = resume * 0.15;
  const projectsWeighted = projects * 0.10;
  const interviewWeighted = interview * 0.10;

  const totalScore = Math.round(dsaWeighted + csWeighted + resumeWeighted + projectsWeighted + interviewWeighted);

  let status: "Developing" | "Competitive" | "Ready" = "Developing";
  let colorClass = "text-amber-500 border-amber-500/20 bg-amber-500/10";

  if (totalScore >= 80) {
    status = "Ready";
    colorClass = "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
  } else if (totalScore >= 60) {
    status = "Competitive";
    colorClass = "text-indigo-500 border-indigo-500/20 bg-indigo-500/10";
  }

  return {
    score: totalScore,
    status,
    colorClass,
    breakdown: {
      dsa,
      cs,
      resume,
      projects,
      interview
    }
  };
}
