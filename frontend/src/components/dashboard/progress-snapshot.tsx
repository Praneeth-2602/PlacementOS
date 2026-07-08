import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProgressSnapshotProps {
  leetcodeSolved: number;
  githubRepos: number;
  githubStars: number;
}

export function ProgressSnapshot({ leetcodeSolved, githubRepos, githubStars }: ProgressSnapshotProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">LeetCode Solved</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{leetcodeSolved}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">GitHub Repos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{githubRepos}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Stars</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{githubStars}</p>
        </CardContent>
      </Card>
    </div>
  );
}
