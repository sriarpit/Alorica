"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, ExternalLink, Calendar, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface MilestoneData {
  id: string;
  label: string;
  owner: string | null;
  status: string;
  daysTaken: number | null;
  dueDate: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  remarks: string | null;
  riskStatus: string;
  delayedDays: number | null;
  sla: number | null;
}

interface PhaseData {
  phase: number;
  label: string;
  completionPct: number;
  riskStatus: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  milestones: MilestoneData[];
}

interface PageData {
  project: {
    id: string;
    prjNumber: string;
    name: string;
    status: string;
    phase: string;
    region: string | null;
    country: string | null;
    location: string | null;
    startDate: string | null;
    goLiveDate: string | null;
    progressPct: number;
    projectManager: { name: string } | null;
    businessOwner: { name: string } | null;
    googlemapsLink: string | null;
  };
  allProjects: { id: string; name: string; prjNumber: string }[];
  timelineCheckpoints: {
    label: string;
    status: "completed" | "in-progress" | "pending" | "delayed";
    completedDate: string | null;
  }[];
  phases: PhaseData[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function statusBadgeVariant(status: string): any {
  switch (status) {
    case "Completed": return "completed";
    case "InProgress": case "WorkinProgress": return "in-progress";
    case "Delayed": return "delayed";
    case "Pending": return "pending";
    default: return "secondary";
  }
}

function riskBadgeVariant(risk: string): any {
  switch (risk) {
    case "On Time": return "on-time";
    case "On Risk": return "at-risk";
    case "Delayed": return "delayed";
    default: return "secondary";
  }
}

function timelineCircleClass(status: "completed" | "in-progress" | "pending" | "delayed") {
  switch (status) {
    case "completed": return "bg-green-500 border-green-500 text-white";
    case "in-progress": return "bg-orange-400 border-orange-400 text-white";
    case "delayed": return "bg-red-500 border-red-500 text-white";
    default: return "bg-white border-gray-300 text-gray-400";
  }
}

function timelineLineClass(status: "completed" | "in-progress" | "pending" | "delayed") {
  switch (status) {
    case "completed": return "bg-green-400";
    case "in-progress": return "bg-orange-300";
    case "delayed": return "bg-red-300";
    default: return "bg-gray-200";
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

export function MilestoneTrackingClient({ data }: { data: PageData }) {
  const router = useRouter();
  const { project, allProjects, timelineCheckpoints, phases } = data;

  // Default to first phase that has milestones, or phase 2
  const defaultPhase = phases.find((p) => p.milestones.length > 0)?.phase ?? 2;
  const [selectedPhase, setSelectedPhase] = useState(defaultPhase);

  const activePhase = phases.find((p) => p.phase === selectedPhase) ?? phases[0];

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

          {/* Project Dropdown + Status */}
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Project
            </label>
            <Select
              value={project.id}
              onValueChange={(id) => router.push(`/milestone-tracking/${id}`)}
            >
              <SelectTrigger className="h-10 font-semibold text-gray-900 max-w-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.prjNumber} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusBadgeVariant(project.status)} className="text-sm px-3 py-1">
              {project.status === "InProgress" ? "In Progress" : project.status}
            </Badge>
          </div>
        </div>

        {/* Key fields grid */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Business PM</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-gray-400" />
              {project.businessOwner?.name ?? project.projectManager?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Start Date</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {fmtDate(project.startDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Go-Live Date</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {fmtDate(project.goLiveDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Progress</p>
            <div className="flex items-center gap-2">
              <Progress value={project.progressPct} className="h-2 flex-1" />
              <span className="font-semibold text-gray-900 tabular-nums">
                {project.progressPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Location & Google Maps ──────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium">
              {[project.region, project.country, project.location]
                .filter(Boolean)
                .join(" – ") || "Location not set"}
            </span>
          </div>
          {project.googlemapsLink && (
            <a
              href={project.googlemapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-md px-3 py-1.5 transition-colors shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Google Maps
            </a>
          )}
        </div>
      </div>

      {/* ── Project Timeline ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-6 text-sm uppercase tracking-wide">
          Project Timeline
        </h3>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-start min-w-max">
            {timelineCheckpoints.map((cp, idx) => (
              <div key={cp.label} className="flex items-start">
                {/* Checkpoint */}
                <div className="flex flex-col items-center w-28">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold shrink-0",
                      timelineCircleClass(cp.status)
                    )}
                  >
                    {idx + 1}
                  </div>
                  <p className="mt-2 text-center text-xs text-gray-600 leading-snug font-medium px-1">
                    {cp.label}
                  </p>
                  {cp.completedDate && (
                    <p className="mt-1 text-center text-xs text-gray-400">
                      {fmtDate(cp.completedDate)}
                    </p>
                  )}
                </div>

                {/* Connector line */}
                {idx < timelineCheckpoints.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-8 mt-4 shrink-0",
                      timelineLineClass(cp.status)
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          {[
            { color: "bg-green-500", label: "Completed" },
            { color: "bg-orange-400", label: "In Progress" },
            { color: "bg-red-500", label: "Delayed" },
            { color: "bg-gray-300", label: "Pending" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Phase Summary (clickable) ───────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {phases.map((phase) => (
          <button
            key={phase.phase}
            onClick={() => setSelectedPhase(phase.phase)}
            className={cn(
              "bg-white rounded-lg border p-4 text-left transition-all",
              selectedPhase === phase.phase
                ? "border-[#0f1e35] ring-2 ring-[#0f1e35]/20 shadow-md"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
            )}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 leading-tight">
              Phase {phase.phase}
            </p>
            <p className="text-xs font-medium text-gray-800 leading-snug mb-3">{phase.label}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">{phase.completionPct}%</span>
                <Badge variant={riskBadgeVariant(phase.riskStatus)} className="text-xs">
                  {phase.riskStatus}
                </Badge>
              </div>
              <Progress
                value={phase.completionPct}
                className={cn(
                  "h-1.5",
                  phase.riskStatus === "Delayed" && "[&>div]:bg-red-500",
                  phase.riskStatus === "On Risk" && "[&>div]:bg-orange-500",
                  phase.riskStatus === "On Time" && "[&>div]:bg-green-500"
                )}
              />
              {(phase.plannedStartDate || phase.plannedEndDate) && (
                <p className="text-xs text-gray-400">
                  {fmtDate(phase.plannedStartDate)} – {fmtDate(phase.plannedEndDate)}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ── Milestone Details ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">
              Phase {activePhase.phase} — {activePhase.label}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {activePhase.milestones.filter((m) => m.status === "Completed").length} of{" "}
              {activePhase.milestones.length} milestones completed
            </p>
          </div>
          <Badge variant={riskBadgeVariant(activePhase.riskStatus)}>
            {activePhase.riskStatus}
          </Badge>
        </div>

        {activePhase.milestones.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No milestones configured for this phase yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-56">
                    Milestone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Days Taken
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Planned
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activePhase.milestones.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    {/* Milestone Name */}
                    <td className="px-4 py-3 font-medium text-gray-900 align-top">
                      {m.label}
                      {m.sla && (
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">
                          (SLA: {m.sla}d)
                        </span>
                      )}
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3 text-gray-600 align-top">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400 shrink-0" />
                        {m.owner ?? <span className="text-gray-400">—</span>}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 align-top">
                      <Badge variant={statusBadgeVariant(m.status)}>
                        {m.status === "InProgress" ? "In Progress" : m.status}
                      </Badge>
                    </td>

                    {/* Risk */}
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-0.5">
                        <Badge variant={riskBadgeVariant(m.riskStatus)}>
                          {m.riskStatus}
                        </Badge>
                        {m.delayedDays != null && (
                          <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Delayed – {m.delayedDays} day{m.delayedDays !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Days Taken */}
                    <td className="px-4 py-3 text-gray-600 align-top tabular-nums">
                      {m.daysTaken != null ? `${m.daysTaken}d` : "—"}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3 text-gray-600 align-top">
                      {fmtDate(m.dueDate)}
                    </td>

                    {/* Planned Start – End */}
                    <td className="px-4 py-3 text-gray-600 align-top text-xs">
                      <div>{fmtDate(m.plannedStartDate)}</div>
                      <div className="text-gray-400">→ {fmtDate(m.plannedEndDate)}</div>
                    </td>

                    {/* Actual Start – End */}
                    <td className="px-4 py-3 align-top text-xs">
                      <div className="text-gray-600">{fmtDate(m.actualStartDate)}</div>
                      <div className="text-gray-400">→ {fmtDate(m.actualEndDate)}</div>
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-3 text-gray-500 align-top max-w-48">
                      <p className="text-xs leading-relaxed line-clamp-3">
                        {m.remarks || <span className="text-gray-300">—</span>}
                      </p>
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
