import { getApiUrl } from "./utils";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface IntegrationStatus {
  is_connected: boolean;
  username?: string | null;
  last_synced_at?: string | null;
  sync_status: string;
}

export interface UserProfile {
  id: string;
  university?: string | null;
  graduation_year?: number | null;
  target_role?: string | null;
  bio?: string | null;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  role: string;
  created_at: string;
  profile?: UserProfile | null;
  leetcode?: IntegrationStatus | null;
  github?: IntegrationStatus | null;
}

export interface LeetCodeStats {
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  ranking?: number | null;
  current_streak: number;
  contest_rating: number;
  submission_calendar?: Record<string, number> | null;
  updated_at?: string | null;
}

export interface LeetCodeTopic {
  id: string;
  topic: string;
  solved_count: number;
  needs_revision: boolean;
}

export interface GitHubRepo {
  id: string;
  github_repo_id: number;
  name: string;
  full_name: string;
  description?: string | null;
  stars: number;
  forks: number;
  language?: string | null;
  topics?: string[] | null;
  pushed_at?: string | null;
  is_featured: boolean;
}

export interface GitHubActivity {
  total_contributions: number;
  contribution_calendar?: Record<string, number> | null;
  updated_at?: string | null;
}

export interface ReadinessScore {
  dsa_score: number;
  cs_score: number;
  projects_score: number;
  interview_score: number;
  resume_score: number;
  opportunities_score: number;
  overall_score: number;
  updated_at?: string | null;
}

export interface DashboardData {
  readiness: ReadinessScore;
  progress: {
    leetcode_total_solved: number;
    github_repo_count: number;
    github_total_stars: number;
  };
  weekly_goal?: {
    dsa_target: number;
    dsa_completed: number;
    cs_target: number;
    cs_completed: number;
  } | null;
  streak_current: number;
  upcoming_deadlines: Opportunity[];
  leetcode_stats?: LeetCodeStats | null;
  github_activity?: GitHubActivity | null;
  target_companies?: string[];
}

export type LearningStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "NEEDS_REVISION";

export interface CSTopicProgress {
  id: string;
  subject: string;
  topic: string;
  status: LearningStatus;
  confidence: number;
  last_revised_at?: string | null;
}

export interface CSSummary {
  subject: string;
  total_topics: number;
  completed_topics: number;
  completion_percent: number;
}

export interface AptitudeTopicProgress {
  id: string;
  section: "QUANT" | "LOGICAL" | "VERBAL";
  topic: string;
  attempted: number;
  correct: number;
}

export interface NoteItem {
  id: string;
  subject: string;
  topic?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PrepareQuestion {
  id: string;
  type: "TECHNICAL" | "HR";
  company?: string | null;
  topic?: string | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | null;
  question: string;
  answer?: string | null;
  tags?: string[] | null;
}

export interface StarTemplate {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  created_at: string;
}

export interface MockSession {
  id: string;
  type: "TECHNICAL" | "HR" | "MIXED";
  duration_minutes: number;
  questions_answered: number;
  self_score: number;
  notes?: string | null;
  created_at: string;
}

export interface SessionStats {
  total_sessions: number;
  average_score: number;
  this_week_count: number;
  trend: Array<{ date: string; avg_score: number }>;
}

export type OpportunityStatus =
  | "TRACKING"
  | "APPLIED"
  | "OA_SCHEDULED"
  | "INTERVIEW_SCHEDULED"
  | "OFFERED"
  | "REJECTED"
  | "ACCEPTED"
  | "DECLINED";

export interface Opportunity {
  id: string;
  company: string;
  role: string;
  type: "PLACEMENT" | "INTERNSHIP" | "OFF_CAMPUS" | "OTHER";
  status: OpportunityStatus;
  ctc?: string | null;
  deadline?: string | null;
  oa_date?: string | null;
  jd_url?: string | null;
  calendar_synced?: boolean;
}

export interface ResumeItem {
  id: string;
  version_name: string;
  target_role?: string | null;
  is_default: boolean;
  file_url?: string | null;
  json_data?: Record<string, unknown> | null;
  ats_score?: number | null;
  ats_v2_score?: number | null;
  ats_analysis?: Record<string, unknown> | null;
  matched_keywords?: string[] | null;
  missing_keywords?: string[] | null;
  suggestions?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface BuildProject {
  id: string;
  name: string;
  description?: string | null;
  tech_stack: string[];
  github_url?: string | null;
  deployment_url?: string | null;
  status: "IDEA" | "IN_PROGRESS" | "COMPLETED";
  is_featured: boolean;
  repo_id?: string | null;
}

export interface BuildPortfolio {
  featured_projects: BuildProject[];
  featured_repos: GitHubRepo[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface InterviewTwinMessage {
  role: "assistant" | "user";
  content: string;
  feedback?: string | null;
}

export interface InterviewTwinSession {
  session_id: string;
  question_number: number;
  total_questions: number;
  current_question: string;
  completed: boolean;
  summary?: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    improvement_areas: string[];
  } | null;
}

export interface BenchmarkData {
  cohort: { year: number; size: number };
  percentile: Record<string, number>;
  benchmarks: Record<string, { p25: number; p50: number; p75: number }>;
}

export interface CompanyReadiness {
  company: string;
  overall_score: number;
  weights: Record<string, number>;
  category_scores: Record<string, number>;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface ScoreHistoryPoint {
  date: string;
  overall: number;
  dsa: number;
  cs: number;
  projects: number;
  interview: number;
  resume: number;
  opportunities: number;
}

export interface TopicBreakdownPoint {
  topic: string;
  score: number;
}

export interface WeeklyReportPoint {
  week: string;
  goals_completed: number;
  total_goals: number;
}

export type SyncState = "idle" | "syncing" | "complete" | "failed";

export interface SyncStatus {
  status: SyncState;
  progress: number;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  health: () => apiFetch<{ status: string; version: string }>("/health"),
  me: () => apiFetch<User>("/auth/me"),
  logout: () =>
    fetch(`${getApiUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
      redirect: "manual",
    }),
  refresh: () => apiFetch<null>("/auth/refresh", { method: "POST" }),

  dashboard: () => apiFetch<DashboardData>("/dashboard"),
  dashboardToday: () => apiFetch<{ tasks: string[]; cs_topics: string[]; upcoming_cta?: string | null }>("/dashboard/today"),
  dashboardRecentActivity: () =>
    apiFetch<Array<{ id: string; type: string; title: string; created_at: string }>>("/dashboard/recent-activity"),

  readiness: () => apiFetch<ReadinessScore>("/readiness"),
  recalculateReadiness: () => apiFetch<ReadinessScore>("/readiness/recalculate", { method: "POST" }),
  readinessRecommendations: () => apiFetch<Array<{ title: string; description: string }>>("/readiness/recommendations"),
  readinessBenchmarks: () => apiFetch<BenchmarkData>("/readiness/benchmarks"),
  readinessByCompany: (companyName: string) =>
    apiFetch<CompanyReadiness>(`/readiness/by-company/${encodeURIComponent(companyName)}`),

  leetcodeSync: (username: string) =>
    apiFetch<{ job_id: string }>("/leetcode/sync", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
  leetcodeStats: () => apiFetch<LeetCodeStats>("/leetcode/stats"),
  leetcodeTopics: () => apiFetch<LeetCodeTopic[]>("/leetcode/topics"),
  toggleTopicRevision: (topic: string) =>
    apiFetch<LeetCodeTopic>(`/leetcode/topics/${encodeURIComponent(topic)}/revision`, { method: "PUT" }),

  githubSync: () => apiFetch<{ job_id: string }>("/github/sync", { method: "POST" }),
  githubRepos: () => apiFetch<GitHubRepo[]>("/github/repos"),
  githubFeaturedRepos: () => apiFetch<GitHubRepo[]>("/github/repos/featured"),
  toggleRepoFeature: (repoId: string) =>
    apiFetch<GitHubRepo>(`/github/repos/${repoId}/feature`, { method: "PUT" }),
  githubActivity: () => apiFetch<GitHubActivity>("/github/activity"),
  googleCalendarAuth: () => apiFetch<{ connected: boolean }>("/auth/google/calendar", { method: "POST" }),

  learnCS: (subject: string) => apiFetch<CSTopicProgress[]>(`/learn/cs/${encodeURIComponent(subject)}`),
  updateCSTopic: (subject: string, topic: string, payload: { status?: LearningStatus; confidence?: number }) =>
    apiFetch<CSTopicProgress>(`/learn/cs/${encodeURIComponent(subject)}/${encodeURIComponent(topic)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  learnCSSummary: () => apiFetch<CSSummary[]>("/learn/cs/summary"),
  learnAptitude: (section: string) => apiFetch<AptitudeTopicProgress[]>(`/learn/aptitude/${encodeURIComponent(section)}`),
  updateAptitudeTopic: (section: string, topic: string, payload: { attempted: number; correct: number }) =>
    apiFetch<AptitudeTopicProgress>(`/learn/aptitude/${encodeURIComponent(section)}/${encodeURIComponent(topic)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  notes: (subject?: string) => apiFetch<NoteItem[]>(`/notes${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),
  note: (id: string) => apiFetch<NoteItem>(`/notes/${id}`),
  createNote: (payload: { subject: string; topic?: string; content: string }) =>
    apiFetch<NoteItem>("/notes", { method: "POST", body: JSON.stringify(payload) }),
  updateNote: (id: string, payload: { subject?: string; topic?: string; content?: string }) =>
    apiFetch<NoteItem>(`/notes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNote: (id: string) => apiFetch<null>(`/notes/${id}`, { method: "DELETE" }),

  prepareQuestions: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return apiFetch<PrepareQuestion[]>(`/prepare/questions${query}`);
  },
  prepareQuestion: (id: string) => apiFetch<PrepareQuestion>(`/prepare/questions/${id}`),
  starTemplates: () => apiFetch<StarTemplate[]>("/prepare/star-templates"),
  createStarTemplate: (payload: Omit<StarTemplate, "id" | "created_at">) =>
    apiFetch<StarTemplate>("/prepare/star-templates", { method: "POST", body: JSON.stringify(payload) }),
  createMockSession: (payload: Omit<MockSession, "id" | "created_at">) =>
    apiFetch<MockSession>("/prepare/sessions", { method: "POST", body: JSON.stringify(payload) }),
  mockSessions: () => apiFetch<MockSession[]>("/prepare/sessions"),
  mockSessionStats: () => apiFetch<SessionStats>("/prepare/sessions/stats"),

  startInterviewTwin: (payload: { company: string; role: string }) =>
    apiFetch<InterviewTwinSession>("/prepare/interview-twin/start", { method: "POST", body: JSON.stringify(payload) }),
  respondInterviewTwin: (payload: { session_id: string; answer: string }) =>
    apiFetch<InterviewTwinSession & { feedback: string }>("/prepare/interview-twin/respond", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  endInterviewTwin: (payload: { session_id: string }) =>
    apiFetch<InterviewTwinSession>("/prepare/interview-twin/end", { method: "POST", body: JSON.stringify(payload) }),

  opportunities: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return apiFetch<Opportunity[]>(`/opportunities${query}`);
  },
  createOpportunity: (payload: Omit<Opportunity, "id" | "calendar_synced">) =>
    apiFetch<Opportunity>("/opportunities", { method: "POST", body: JSON.stringify(payload) }),
  updateOpportunity: (id: string, payload: Partial<Opportunity>) =>
    apiFetch<Opportunity>(`/opportunities/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteOpportunity: (id: string) => apiFetch<null>(`/opportunities/${id}`, { method: "DELETE" }),
  updateOpportunityStatus: (id: string, status: OpportunityStatus) =>
    apiFetch<Opportunity>(`/opportunities/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  opportunityDeadlines: () => apiFetch<Opportunity[]>("/opportunities/deadlines"),
  opportunityCalendar: () => apiFetch<Opportunity[]>("/opportunities/calendar"),
  syncOpportunityCalendar: (id: string) => apiFetch<Opportunity>(`/opportunities/${id}/calendar-sync`, { method: "POST" }),
  unsyncOpportunityCalendar: (id: string) =>
    apiFetch<Opportunity>(`/opportunities/${id}/calendar-sync`, { method: "DELETE" }),

  resumes: () => apiFetch<ResumeItem[]>("/resume"),
  resume: (id: string) => apiFetch<ResumeItem>(`/resume/${id}`),
  createResume: (payload: Partial<ResumeItem>) => apiFetch<ResumeItem>("/resume", { method: "POST", body: JSON.stringify(payload) }),
  updateResume: (id: string, payload: Partial<ResumeItem>) =>
    apiFetch<ResumeItem>(`/resume/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteResume: (id: string) => apiFetch<null>(`/resume/${id}`, { method: "DELETE" }),
  setDefaultResume: (id: string) => apiFetch<ResumeItem>(`/resume/${id}/default`, { method: "PUT" }),
  uploadResume: (formData: FormData) => apiFetch<ResumeItem>("/resume/upload", { method: "POST", body: formData }),
  analyzeResume: (id: string) => apiFetch<ResumeItem>(`/resume/${id}/analyze`, { method: "POST" }),
  analyzeResumeV2: (id: string, payload: { jobDescriptionText?: string }) =>
    apiFetch<ResumeItem>(`/resume/${id}/analyze-v2`, { method: "POST", body: JSON.stringify(payload) }),
  exportResume: (id: string) => apiFetch<{ file_url: string }>(`/resume/${id}/export`, { method: "POST" }),

  buildProjects: () => apiFetch<BuildProject[]>("/build/projects"),
  createBuildProject: (payload: Omit<BuildProject, "id" | "is_featured">) =>
    apiFetch<BuildProject>("/build/projects", { method: "POST", body: JSON.stringify(payload) }),
  updateBuildProject: (id: string, payload: Partial<BuildProject>) =>
    apiFetch<BuildProject>(`/build/projects/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBuildProject: (id: string) => apiFetch<null>(`/build/projects/${id}`, { method: "DELETE" }),
  featureBuildProject: (id: string) => apiFetch<BuildProject>(`/build/projects/${id}/feature`, { method: "PUT" }),
  linkBuildProjectRepo: (id: string, repoId: string) =>
    apiFetch<BuildProject>(`/build/projects/${id}/link-repo`, { method: "PUT", body: JSON.stringify({ repo_id: repoId }) }),
  buildPortfolio: () => apiFetch<BuildPortfolio>("/build/portfolio"),

  notifications: () => apiFetch<NotificationItem[]>("/notifications"),
  markNotificationRead: (id: string) => apiFetch<NotificationItem>(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => apiFetch<null>("/notifications/read-all", { method: "PUT" }),
  unreadNotificationsCount: () => apiFetch<{ unread: number }>("/notifications/unread-count"),
  subscribeNotifications: (token: string) =>
    apiFetch<null>("/notifications/subscribe", { method: "POST", body: JSON.stringify({ token }) }),
  unsubscribeNotifications: (token: string) =>
    apiFetch<null>("/notifications/subscribe", { method: "DELETE", body: JSON.stringify({ token }) }),

  dsaHeatmap: () => apiFetch<HeatmapDay[]>("/track/dsa-heatmap"),
  scoreHistory: () => apiFetch<ScoreHistoryPoint[]>("/track/score-history"),
  topicBreakdown: () => apiFetch<TopicBreakdownPoint[]>("/track/topic-breakdown"),
  weeklyReport: () => apiFetch<WeeklyReportPoint[]>("/track/weekly-report"),

  updateUserSettings: (payload: Record<string, unknown>) =>
    apiFetch<User>("/users/settings", { method: "PUT", body: JSON.stringify(payload) }),
};

export function getOAuthUrl(provider: "google" | "github"): string {
  return `${getApiUrl()}/auth/${provider}`;
}

export function getSyncStatusUrl(type: "leetcode" | "github"): string {
  return `${getApiUrl()}/${type}/sync/status`;
}
