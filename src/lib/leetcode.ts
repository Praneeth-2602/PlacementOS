export interface LeetCodeStats {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number;
  streak: number;
}

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats | null> {
  const cleanUsername = username.trim();
  if (!cleanUsername) return null;

  const url = "https://leetcode.com/graphql";
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://leetcode.com",
  };

  try {
    // 1. Fetch Solved questions stats
    const solvedResponse = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `
          query userProblemsSolved($username: String!) {
            matchedUser(username: $username) {
              submitStats: submitStatsGlobal {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
            }
          }
        `,
        variables: { username: cleanUsername },
      }),
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!solvedResponse.ok) {
      throw new Error(`LeetCode solved query failed with status ${solvedResponse.status}`);
    }

    const solvedData = await solvedResponse.json();
    const matchedUser = solvedData.data?.matchedUser;

    if (!matchedUser) {
      // User not found
      return null;
    }

    const submissionNums = matchedUser.submitStats?.acSubmissionNum || [];
    let totalSolved = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    for (const item of submissionNums) {
      if (item.difficulty === "All") totalSolved = item.count;
      else if (item.difficulty === "Easy") easySolved = item.count;
      else if (item.difficulty === "Medium") mediumSolved = item.count;
      else if (item.difficulty === "Hard") hardSolved = item.count;
    }

    // 2. Fetch Contest Rating
    let contestRating = 0;
    try {
      const contestResponse = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `
            query userContestRanking($username: String!) {
              userContestRanking(username: $username) {
                rating
              }
            }
          `,
          variables: { username: cleanUsername },
        }),
        next: { revalidate: 60 }
      });

      if (contestResponse.ok) {
        const contestData = await contestResponse.json();
        if (contestData.data?.userContestRanking?.rating) {
          contestRating = Math.round(contestData.data.userContestRanking.rating);
        }
      }
    } catch (e) {
      console.error("Failed to fetch contest ranking", e);
    }

    // 3. Fetch User Streak Calendar
    let streak = 0;
    try {
      const calendarResponse = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `
            query userProfileCalendar($username: String!) {
              matchedUser(username: $username) {
                userCalendar {
                  streak
                }
              }
            }
          `,
          variables: { username: cleanUsername },
        }),
        next: { revalidate: 60 }
      });

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        if (calendarData.data?.matchedUser?.userCalendar?.streak) {
          streak = calendarData.data.matchedUser.userCalendar.streak;
        }
      }
    } catch (e) {
      console.error("Failed to fetch user calendar streak", e);
    }

    return {
      username: cleanUsername,
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      contestRating,
      streak,
    };
  } catch (error) {
    console.error("Error fetching LeetCode data:", error);
    // If the network call fails (e.g. rate limit, cors, offline), return mock values or throw
    return null;
  }
}
