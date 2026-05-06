"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, User, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProjectCardData {
  id: string;
  prjNumber: string;
  name: string;
  projectManager: { name: string } | null;
  businessOwner: { name: string } | null;
  status: string;
  phase: string;
  region: string | null;
  country: string | null;
  location: string | null;
  classification: string | null;
  startDate: string | null;
  goLiveDate: string | null;
  progressPct: number;
  riskStatus: string | null;
}

function statusVariant(status: string) {
  switch (status) {
    case "InProgress": return "in-progress";
    case "Completed": return "completed";
    case "Delayed": return "delayed";
    case "Pending": return "pending";
    default: return "secondary";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "InProgress": return "In Progress";
    case "ApprovedbyLeadership": return "Approved";
    case "WorkinProgress": return "Work in Progress";
    default: return status;
  }
}

function riskVariant(risk: string) {
  switch (risk) {
    case "On Time": return "on-time";
    case "At Risk": return "at-risk";
    case "Delayed": return "delayed";
    default: return "secondary";
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const start = formatDate(project.startDate);
  const goLive = formatDate(project.goLiveDate);

  return (
    <Link href={`/milestone-tracking/${project.id}`} className="block group">
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
        {/* Project number */}
        <p className="text-xs font-mono text-gray-400 mb-1">{project.prjNumber}</p>

        {/* Project name */}
        <p className="text-sm font-semibold text-gray-900 leading-snug mb-3 group-hover:text-[#0f1e35] line-clamp-2">
          {project.name}
        </p>

        {/* PM */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{project.projectManager?.name ?? "—"}</span>
        </div>

        {/* Location */}
        {(project.location || project.country) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {[project.location, project.country].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Date range */}
        {(start || goLive) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span>
              {start ?? "—"} → {goLive ?? "—"}
            </span>
          </div>
        )}

        {/* Status + Risk badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant={statusVariant(project.status) as any} className="text-xs">
            {statusLabel(project.status)}
          </Badge>
          {project.riskStatus && (
            <Badge variant={riskVariant(project.riskStatus) as any} className="text-xs">
              {project.riskStatus}
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span className="font-medium">{project.progressPct}%</span>
          </div>
          <Progress
            value={project.progressPct}
            className={cn(
              "h-1.5",
              project.progressPct === 100
                ? "[&>div]:bg-green-500"
                : project.riskStatus === "Delayed"
                ? "[&>div]:bg-red-500"
                : project.riskStatus === "At Risk"
                ? "[&>div]:bg-orange-500"
                : "[&>div]:bg-blue-500"
            )}
          />
        </div>
      </div>
    </Link>
  );
}
