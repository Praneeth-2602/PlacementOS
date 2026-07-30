import { WifiOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">You&apos;re offline</p>
            <p className="mt-1 text-sm text-muted-foreground">
              PlacementOS needs a connection for live data. Your cached pages are still available.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">Retry</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
