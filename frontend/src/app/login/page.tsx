import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOAuthUrl } from "@/lib/api";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">PlacementOS</CardTitle>
          <CardDescription>Sign in to track your placement readiness</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href={getOAuthUrl("google")}>Continue with Google</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href={getOAuthUrl("github")}>Continue with GitHub</Link>
          </Button>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            By signing in, you agree to sync your LeetCode and GitHub data in later phases.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
