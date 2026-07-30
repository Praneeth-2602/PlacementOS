"use client";

import { Download, FileText } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useOrgPlacementReport } from "@/hooks/use-api";
import { api } from "@/lib/api";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function OrgReportsPage() {
  const { activeOrg, activeOrgId, isLoading: orgLoading } = useActiveOrg();
  const { data: report, isLoading } = useOrgPlacementReport(activeOrgId ?? "", undefined, !!activeOrgId);

  if (orgLoading) return <LoadingState label="Loading..." />;
  if (!activeOrg) {
    return <EmptyState icon={FileText} title="No organization" description="Create an organization from the Overview tab first." />;
  }

  const download = (format: "csv" | "pdf") => {
    // Export is a server-generated file; open in a new tab so the browser handles
    // the download with credentials via the standard cookie flow.
    window.open(api.orgReportExportUrl(activeOrg.id, format), "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">Placement statistics and cohort breakdowns.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download("csv")}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => download("pdf")}>
            <Download className="mr-1 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading report..." />
      ) : !report ? (
        <EmptyState icon={FileText} title="No report data" description="Placement data will appear as drives conclude." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total offers" value={report.total_offers} />
            <StatCard label="Median package" value={`₹${report.median_package} LPA`} />
            <StatCard label="Placement %" value={`${Math.round(report.placement_percent)}%`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By branch</CardTitle>
                <CardDescription>Offers and placement rate per branch</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {report.by_branch.map((row) => (
                    <div key={row.branch} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="font-medium">{row.branch}</span>
                      <span className="text-muted-foreground">
                        {row.offers} offers · {Math.round(row.placement_percent)}%
                      </span>
                    </div>
                  ))}
                  {report.by_branch.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">No branch data.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">By graduation year</CardTitle>
                <CardDescription>Offers and placement rate per year</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {report.by_year.map((row) => (
                    <div key={row.year} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="font-medium">{row.year}</span>
                      <span className="text-muted-foreground">
                        {row.offers} offers · {Math.round(row.placement_percent)}%
                      </span>
                    </div>
                  ))}
                  {report.by_year.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">No yearly data.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
