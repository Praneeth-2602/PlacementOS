"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, GraduationCap, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMentorRequests, useMentors } from "@/hooks/use-api";
import { api, type MentorProfile } from "@/lib/api";

const EXPERTISE_FILTERS = ["All", "DSA", "System Design", "Frontend", "Backend", "ML", "Product"];

function MentorCard({ mentor }: { mentor: MentorProfile }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState(mentor.availability[0] ?? "");
  const [message, setMessage] = useState("");

  const request = useMutation({
    mutationFn: () => api.requestMentor(mentor.id, { slot, message }),
    onSuccess: () => {
      toast.success("Request sent to mentor");
      setOpen(false);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["mentors", "requests"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {mentor.name?.[0]?.toUpperCase() ?? "M"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{mentor.name ?? "Mentor"}</p>
            <p className="text-xs text-muted-foreground">{mentor.seniority}</p>
          </div>
        </div>
        {mentor.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{mentor.bio}</p>}
        <div className="flex flex-wrap gap-1">
          {mentor.expertise.map((area) => (
            <Badge key={area} variant="secondary">
              {area}
            </Badge>
          ))}
        </div>
        {mentor.availability.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3 w-3" /> {mentor.availability.length} slots available
          </p>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full">
              Request session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a session with {mentor.name ?? "mentor"}</DialogTitle>
              <DialogDescription>Pick an available slot and add a short note.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {mentor.availability.map((s) => (
                  <Button key={s} size="sm" variant={slot === s ? "default" : "outline"} onClick={() => setSlot(s)}>
                    {s}
                  </Button>
                ))}
                {mentor.availability.length === 0 && (
                  <Input value={slot} onChange={(e) => setSlot(e.target.value)} placeholder="Proposed time" />
                )}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would you like help with?"
              />
            </div>
            <DialogFooter>
              <Button onClick={() => request.mutate()} disabled={!slot || request.isPending}>
                Send request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function BecomeMentorDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expertise, setExpertise] = useState("");
  const [seniority, setSeniority] = useState("Senior");
  const [availability, setAvailability] = useState("");
  const [bio, setBio] = useState("");

  const save = useMutation({
    mutationFn: () =>
      api.upsertMentorProfile({
        expertise: expertise.split(",").map((s) => s.trim()).filter(Boolean),
        seniority,
        availability: availability.split(",").map((s) => s.trim()).filter(Boolean),
        is_active: true,
        bio,
      }),
    onSuccess: () => {
      toast.success("You're now listed as a mentor");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["mentors"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-1 h-4 w-4" /> Become a mentor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Opt in as a mentor</DialogTitle>
          <DialogDescription>Share your expertise and availability to help other students.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="Expertise (comma separated)" />
          <Input value={seniority} onChange={(e) => setSeniority(e.target.value)} placeholder="Seniority (e.g. Senior SWE)" />
          <Input
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="Availability slots (comma separated)"
          />
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio" />
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!expertise.trim() || save.isPending}>
            Save mentor profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MentorsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All");
  const { data: mentors = [], isLoading } = useMentors(filter === "All" ? undefined : { expertise: filter });
  const { data: requests = [] } = useMentorRequests();

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACCEPTED" | "DECLINED" }) =>
      api.respondMentorRequest(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentors", "requests"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mentors</h2>
          <p className="text-muted-foreground">Find mentors by expertise and book a session.</p>
        </div>
        <BecomeMentorDialog />
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="requests">My requests</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EXPERTISE_FILTERS.map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f}
              </Button>
            ))}
          </div>
          {isLoading ? (
            <LoadingState label="Loading mentors..." />
          ) : mentors.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No mentors found" description="Try a different expertise filter." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-3">
          {requests.length === 0 ? (
            <EmptyState icon={Users} title="No requests yet" description="Requests you send or receive appear here." />
          ) : (
            requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {req.mentor_name ?? "Mentor"} ↔ {req.mentee_name ?? "Mentee"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.slot ? `Slot: ${req.slot}` : "No slot"} · {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        req.status === "ACCEPTED" || req.status === "BOOKED"
                          ? "success"
                          : req.status === "DECLINED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {req.status}
                    </Badge>
                    {req.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => respond.mutate({ id: req.id, status: "ACCEPTED" })}>
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: req.id, status: "DECLINED" })}>
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
