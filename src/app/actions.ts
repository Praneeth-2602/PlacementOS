"use strict";

"use server";

import { prisma } from "@/lib/db";
import { fetchLeetCodeStats } from "@/lib/leetcode";
import { revalidatePath } from "next/cache";

// --- LeetCode Profile Actions ---

export async function saveLeetCodeUsername(username: string) {
  if (!username || username.trim() === "") {
    return { success: false, error: "Username cannot be empty" };
  }

  try {
    const stats = await fetchLeetCodeStats(username);
    if (!stats) {
      return { success: false, error: "Username does not exist on LeetCode or API is rate-limited" };
    }

    const profile = await prisma.leetCodeProfile.upsert({
      where: { id: "default" },
      update: {
        username: stats.username,
        totalSolved: stats.totalSolved,
        easySolved: stats.easySolved,
        mediumSolved: stats.mediumSolved,
        hardSolved: stats.hardSolved,
        contestRating: stats.contestRating,
        streak: stats.streak,
      },
      create: {
        id: "default",
        username: stats.username,
        totalSolved: stats.totalSolved,
        easySolved: stats.easySolved,
        mediumSolved: stats.mediumSolved,
        hardSolved: stats.hardSolved,
        contestRating: stats.contestRating,
        streak: stats.streak,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/learn");
    return { success: true, profile };
  } catch (error: any) {
    console.error("Error saving LeetCode username:", error);
    return { success: false, error: error.message || "Failed to update profile" };
  }
}

export async function syncLeetCodeData() {
  try {
    const profile = await prisma.leetCodeProfile.findUnique({
      where: { id: "default" },
    });

    if (!profile) {
      return { success: false, error: "No LeetCode username configured. Go to Settings." };
    }

    const stats = await fetchLeetCodeStats(profile.username);
    if (!stats) {
      return { success: false, error: "Could not sync LeetCode stats. Rate limit or offline." };
    }

    const updatedProfile = await prisma.leetCodeProfile.update({
      where: { id: "default" },
      data: {
        totalSolved: stats.totalSolved,
        easySolved: stats.easySolved,
        mediumSolved: stats.mediumSolved,
        hardSolved: stats.hardSolved,
        contestRating: stats.contestRating,
        streak: stats.streak,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/learn");
    return { success: true, profile: updatedProfile };
  } catch (error: any) {
    console.error("Error syncing LeetCode data:", error);
    return { success: false, error: error.message || "Sync failed" };
  }
}

export async function getLeetCodeProfile() {
  try {
    return await prisma.leetCodeProfile.findUnique({
      where: { id: "default" },
    });
  } catch (error) {
    console.error("Error fetching LeetCode profile:", error);
    return null;
  }
}

// --- Readiness Score Actions ---

export async function getReadinessScores() {
  try {
    let scores = await prisma.readinessScore.findUnique({
      where: { id: "default" },
    });
    if (!scores) {
      try {
        scores = await prisma.readinessScore.create({
          data: {
            id: "default",
            dsaScore: 52.0,
            csScore: 50.0,
            resumeScore: 50.0,
            projectsScore: 50.0,
            interviewScore: 50.0,
          },
        });
      } catch (createError) {
        // Unique key constraint: another worker created it concurrently.
        // Fetch it again.
        scores = await prisma.readinessScore.findUnique({
          where: { id: "default" },
        });
        if (!scores) throw createError;
      }
    }
    return scores;
  } catch (error) {
    console.error("Error fetching readiness scores:", error);
    return {
      id: "default",
      dsaScore: 52.0,
      csScore: 50.0,
      resumeScore: 50.0,
      projectsScore: 50.0,
      interviewScore: 50.0,
    };
  }
}

export async function updateReadinessScores(scores: {
  dsaScore: number;
  csScore: number;
  resumeScore: number;
  projectsScore: number;
  interviewScore: number;
}) {
  try {
    const updated = await prisma.readinessScore.upsert({
      where: { id: "default" },
      update: scores,
      create: {
        id: "default",
        ...scores,
      },
    });
    revalidatePath("/");
    revalidatePath("/track");
    return { success: true, scores: updated };
  } catch (error: any) {
    console.error("Error updating readiness scores:", error);
    return { success: false, error: error.message || "Failed to update scores" };
  }
}

// --- Offer Tracker Actions ---

export async function getJobApplications() {
  try {
    return await prisma.jobApplication.findMany({
      orderBy: { deadline: "asc" },
    });
  } catch (error) {
    console.error("Error fetching job applications:", error);
    return [];
  }
}

export async function addJobApplication(data: {
  company: string;
  role: string;
  deadlineStr: string; // ISO String
  status: string;
}) {
  if (!data.company || !data.role || !data.deadlineStr || !data.status) {
    return { success: false, error: "All fields are required" };
  }

  try {
    const application = await prisma.jobApplication.create({
      data: {
        company: data.company,
        role: data.role,
        deadline: new Date(data.deadlineStr),
        status: data.status,
      },
    });
    revalidatePath("/");
    revalidatePath("/opportunities");
    return { success: true, application };
  } catch (error: any) {
    console.error("Error creating job application:", error);
    return { success: false, error: error.message || "Failed to create application" };
  }
}

export async function updateJobApplicationStatus(id: string, status: string) {
  try {
    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status },
    });
    revalidatePath("/");
    revalidatePath("/opportunities");
    return { success: true, application: updated };
  } catch (error: any) {
    console.error("Error updating job application:", error);
    return { success: false, error: error.message || "Failed to update application" };
  }
}

export async function deleteJobApplication(id: string) {
  try {
    await prisma.jobApplication.delete({
      where: { id },
    });
    revalidatePath("/");
    revalidatePath("/opportunities");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting job application:", error);
    return { success: false, error: error.message || "Failed to delete application" };
  }
}
