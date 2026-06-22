"use client";

import React, { useState, useEffect } from "react";
import { Briefcase, Calendar, Plus, Trash2, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { getJobApplications, addJobApplication, updateJobApplicationStatus, deleteJobApplication } from "@/app/actions";

interface Application {
  id: string;
  company: string;
  role: string;
  deadline: Date;
  status: string;
}

export default function OpportunitiesPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [deadlineStr, setDeadlineStr] = useState("");
  const [status, setStatus] = useState("Interested");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statuses = ["Interested", "Applied", "OA", "Interview", "Offer", "Rejected"];

  const loadData = async () => {
    const data = await getJobApplications();
    // Convert date strings back to Date objects if needed
    const parsed = data.map((app) => ({
      ...app,
      deadline: new Date(app.deadline),
    }));
    setApplications(parsed);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!company.trim() || !role.trim() || !deadlineStr) {
      setError("Please fill in all fields");
      return;
    }

    const res = await addJobApplication({
      company: company.trim(),
      role: role.trim(),
      deadlineStr: new Date(deadlineStr).toISOString(),
      status,
    });

    if (res.success) {
      setCompany("");
      setRole("");
      setDeadlineStr("");
      setStatus("Interested");
      setIsAdding(false);
      loadData();
    } else {
      setError(res.error || "Failed to add application");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updateJobApplicationStatus(id, newStatus);
    if (res.success) {
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteJobApplication(id);
    if (res.success) {
      loadData();
    }
  };

  const getStatusStyle = (appStatus: string) => {
    switch (appStatus) {
      case "Interested":
        return "bg-zinc-800/80 border-zinc-700/60 text-zinc-400";
      case "Applied":
        return "bg-sky-500/10 border-sky-500/20 text-sky-400";
      case "OA":
        return "bg-amber-500/10 border-amber-500/20 text-amber-400";
      case "Interview":
        return "bg-purple-500/10 border-purple-500/20 text-purple-400";
      case "Offer":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
      case "Rejected":
        return "bg-rose-500/10 border-rose-500/20 text-rose-400";
      default:
        return "bg-zinc-800 border-zinc-700 text-zinc-400";
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Offer Deadline Tracker</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage active applications, milestones, and responses.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5 space-y-4 backdrop-blur-sm animate-slide-down">
          <h3 className="text-sm font-bold text-zinc-300">New Application Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Company */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Company</label>
              <input
                type="text"
                placeholder="e.g. Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Role</label>
              <input
                type="text"
                placeholder="e.g. Software Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Deadline</label>
              <input
                type="date"
                value={deadlineStr}
                onChange={(e) => setDeadlineStr(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 border border-zinc-800 hover:bg-zinc-800/40 text-zinc-400 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all"
            >
              Save Application
            </button>
          </div>
        </form>
      )}

      {/* Table Section */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden backdrop-blur-sm">
        {applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Calendar className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-zinc-400">No applications tracked yet</p>
            <p className="text-xs text-zinc-500 mt-1">Add your first job listing to track deadlines and responses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-zinc-900/20 transition-colors">
                    {/* Company */}
                    <td className="px-6 py-4 text-sm font-bold text-zinc-200">
                      {app.company}
                    </td>
                    {/* Role */}
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {app.role}
                    </td>
                    {/* Deadline */}
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{app.deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </td>
                    {/* Status Dropdown */}
                    <td className="px-6 py-4 text-sm">
                      <div className="relative inline-flex items-center">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className={`appearance-none border pl-2.5 pr-8 py-1 rounded-full text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/30 ${getStatusStyle(app.status)}`}
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s} className="bg-zinc-950 text-zinc-300">
                              {s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2.5 pointer-events-none text-zinc-400" />
                        {app.status === "Offer" && (
                          <Sparkles className="w-3 h-3 text-emerald-400 ml-1.5 animate-pulse" />
                        )}
                      </div>
                    </td>
                    {/* Delete Action */}
                    <td className="px-6 py-4 text-sm text-right">
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all"
                        title="Delete application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
