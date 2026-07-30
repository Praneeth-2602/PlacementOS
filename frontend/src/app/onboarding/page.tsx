"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 1 + i);
const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Scientist",
  "ML Engineer",
  "DevOps Engineer",
  "Product Manager",
];
const COMPANY_SUGGESTIONS = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Uber", "Atlassian"];

const STEPS = ["University", "Graduation", "Target role", "Companies"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [university, setUniversity] = useState("");
  const [gradYear, setGradYear] = useState<number | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);

  const submit = useMutation({
    mutationFn: () =>
      api.submitOnboarding({
        university: university.trim(),
        graduation_year: gradYear!,
        target_role: targetRole.trim(),
        target_companies: companies,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "status"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("You're all set! Building your dashboard...");
      router.replace("/dashboard");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addCompany = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || companies.includes(trimmed) || companies.length >= 5) return;
    setCompanies((prev) => [...prev, trimmed]);
    setCompanyInput("");
  };

  const canContinue =
    (step === 0 && university.trim().length > 1) ||
    (step === 1 && gradYear !== null) ||
    (step === 2 && targetRole.trim().length > 1) ||
    step === 3;

  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      submit.mutate();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm font-semibold">Welcome to PlacementOS</span>
          </div>
          <CardTitle className="text-2xl">Let&apos;s set up your profile</CardTitle>
          <CardDescription>
            A few quick details help us tailor your readiness score and daily plan. Step {step + 1} of {STEPS.length}.
          </CardDescription>
          <div className="mt-4 flex gap-2">
            {STEPS.map((label, index) => (
              <div key={label} className="flex-1">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    index <= step ? "bg-primary" : "bg-muted",
                  )}
                />
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    index === step ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Which university do you attend?</label>
              <Input
                autoFocus
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canContinue && next()}
                placeholder="e.g. IIT Bombay"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">When do you graduate?</label>
              <div className="grid grid-cols-3 gap-2">
                {GRAD_YEARS.map((year) => (
                  <Button
                    key={year}
                    type="button"
                    variant={gradYear === year ? "default" : "outline"}
                    onClick={() => setGradYear(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">What role are you targeting?</label>
              <Input
                autoFocus
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canContinue && next()}
                placeholder="e.g. Software Engineer"
              />
              <div className="flex flex-wrap gap-2">
                {ROLE_SUGGESTIONS.map((role) => (
                  <Button key={role} type="button" size="sm" variant="ghost" onClick={() => setTargetRole(role)}>
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Which companies are you aiming for? <span className="text-muted-foreground">(optional, up to 5)</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCompany(companyInput);
                    }
                  }}
                  placeholder="Type a company and press Enter"
                />
                <Button type="button" variant="outline" onClick={() => addCompany(companyInput)}>
                  Add
                </Button>
              </div>
              {companies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {companies.map((company) => (
                    <Badge key={company} variant="secondary" className="gap-1">
                      {company}
                      <button type="button" onClick={() => setCompanies((prev) => prev.filter((c) => c !== company))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {COMPANY_SUGGESTIONS.filter((c) => !companies.includes(c)).map((company) => (
                  <Button key={company} type="button" size="sm" variant="ghost" onClick={() => addCompany(company)}>
                    + {company}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0 || submit.isPending}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {!isLast && (
                <Button type="button" variant="ghost" onClick={() => router.replace("/dashboard")}>
                  Skip for now
                </Button>
              )}
              <Button type="button" onClick={next} disabled={!canContinue || submit.isPending}>
                {submit.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLast ? (
                  <>
                    Finish <Check className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
