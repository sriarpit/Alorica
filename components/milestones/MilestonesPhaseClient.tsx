"use client";

import { useState, useMemo } from "react";
import { MilestoneAccordionItem, type MilestoneActivity, type MilestoneTracking } from "./MilestoneAccordionItem";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Attachment {
  id: string;
  fileName: string;
  fileContent: string;
}

export interface MilestoneRow {
  activity: MilestoneActivity;
  tracking: MilestoneTracking | null;
  initialDocs?: Attachment[];
  initialImages?: Attachment[];
}

interface Props {
  prjId: string;
  phaseNumber: number;
  phaseLabel: string;
  phaseColor: string;
  rows: MilestoneRow[];
  users: { id: string; name: string; email: string }[];
  capexId: string | null;
  userRoles: string[];
  currentUserId: string;
}

const MANAGERS = ["Governance Manager", "Business Manager"];

export function MilestonesPhaseClient({
  prjId,
  phaseNumber,
  phaseLabel,
  phaseColor,
  rows,
  users,
  capexId,
  userRoles,
  currentUserId,
}: Props) {
  const [trackingMap, setTrackingMap] = useState<Record<number, MilestoneTracking>>(() => {
    const m: Record<number, MilestoneTracking> = {};
    for (const r of rows) {
      if (r.tracking) m[r.activity.id] = r.tracking;
    }
    return m;
  });

  const isManager = userRoles.some((r) => MANAGERS.includes(r));

  function handleSaved(activityId: number, tracking: MilestoneTracking) {
    setTrackingMap((prev) => ({ ...prev, [activityId]: tracking }));
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter(
      (r) => (trackingMap[r.activity.id]?.status ?? r.tracking?.status) === "Completed"
    ).length;
    const inProgress = rows.filter(
      (r) => (trackingMap[r.activity.id]?.status ?? r.tracking?.status) === "WorkinProgress"
    ).length;
    const delayed = rows.filter(
      (r) => (trackingMap[r.activity.id]?.status ?? r.tracking?.status) === "Delayed"
    ).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, delayed, pct };
  }, [rows, trackingMap]);

  return (
    <div className="space-y-5">
      {/* Phase header */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${phaseColor}`} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Phase {phaseNumber} — {phaseLabel}
              </h2>
              <p className="text-sm text-gray-500">{stats.total} milestones</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {stats.completed > 0 && (
              <Badge variant="on-time">{stats.completed} Completed</Badge>
            )}
            {stats.inProgress > 0 && (
              <Badge variant="in-progress">{stats.inProgress} In Progress</Badge>
            )}
            {stats.delayed > 0 && (
              <Badge variant="delayed">{stats.delayed} Delayed</Badge>
            )}
            <span className="font-semibold text-gray-700 ml-1">{stats.pct}%</span>
          </div>
        </div>
        <Progress value={stats.pct} className="h-2" />
      </div>

      {/* Milestone accordions */}
      <div className="space-y-2">
        {rows.map((row) => {
          const currentTracking = trackingMap[row.activity.id] ?? row.tracking;
          const canEdit =
            isManager ||
            currentTracking?.assignedTo === currentUserId;
          return (
            <MilestoneAccordionItem
              key={row.activity.id}
              activity={row.activity}
              tracking={currentTracking}
              users={users}
              prjId={prjId}
              capexId={capexId}
              canEdit={canEdit}
              initialDocs={row.initialDocs ?? []}
              initialImages={row.initialImages ?? []}
              onSaved={handleSaved}
            />
          );
        })}
      </div>
    </div>
  );
}
