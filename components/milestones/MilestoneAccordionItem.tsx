"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Save, Clock } from "lucide-react";
import { FileUploadZone } from "@/components/capex/FileUploadZone";
import { getRiskStatus } from "@/lib/sla";
import { cn } from "@/lib/utils";

export interface MilestoneActivity {
  id: number;
  label: string;
  order: number;
  phaseNumber: number;
  sla: number | null;
  sourceSystem: string | null;
  dayType: string | null;
  roleType: string | null;
}

export interface MilestoneTracking {
  id: string;
  status: string;
  assignedTo: string | null;
  assigneeName: string | null;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  plannedEndDate: string | null;
  completedDate: string | null;
  remarks: string | null;
  isActive: boolean;
}

interface Attachment {
  id: string;
  fileName: string;
  fileContent: string;
}

interface Props {
  activity: MilestoneActivity;
  tracking: MilestoneTracking | null;
  users: { id: string; name: string; email: string }[];
  prjId: string;
  capexId: string | null;
  canEdit: boolean;
  initialDocs?: Attachment[];
  initialImages?: Attachment[];
  onSaved?: (activityId: number, tracking: MilestoneTracking) => void;
}

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "WorkinProgress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
];

function statusVariant(status: string): "pending" | "in-progress" | "completed" | "delayed" | "on-time" {
  if (status === "Completed") return "on-time";
  if (status === "WorkinProgress") return "in-progress";
  if (status === "Delayed") return "delayed";
  return "pending";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MilestoneAccordionItem({
  activity,
  tracking: initialTracking,
  users,
  prjId,
  capexId,
  canEdit,
  initialDocs = [],
  initialImages = [],
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState<MilestoneTracking | null>(initialTracking);
  const [form, setForm] = useState({
    status: initialTracking?.status ?? "Pending",
    assignedTo: initialTracking?.assignedTo ?? "",
    startDate: initialTracking?.startDate?.slice(0, 10) ?? "",
    dueDate: initialTracking?.dueDate?.slice(0, 10) ?? "",
    plannedEndDate: initialTracking?.plannedEndDate?.slice(0, 10) ?? "",
    completedDate: initialTracking?.completedDate?.slice(0, 10) ?? "",
    remarks: initialTracking?.remarks ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleStatusChange(value: string) {
    const newStatus = value === "_none" ? "Pending" : value;
    setForm((f) => {
      const next = { ...f, status: newStatus };
      if (newStatus === "WorkinProgress" && !f.startDate) {
        next.startDate = today();
      }
      if (newStatus === "Completed") {
        if (!f.startDate) next.startDate = today();
        if (!f.completedDate) next.completedDate = today();
      }
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${prjId}/milestones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneActivityId: activity.id,
          trackingId: tracking?.id ?? null,
          ...form,
          assignedTo: form.assignedTo || null,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          plannedEndDate: form.plannedEndDate || null,
          completedDate: form.completedDate || null,
          remarks: form.remarks || null,
        }),
      });
      if (res.ok) {
        const updated: MilestoneTracking = await res.json();
        setTracking(updated);
        setSaved(true);
        onSaved?.(activity.id, updated);
      }
    } finally {
      setSaving(false);
    }
  }

  const riskStatus = getRiskStatus(
    tracking?.dueDate ?? null,
    tracking?.completedDate ?? null,
    tracking?.status ?? "Pending"
  );
  const showImages = activity.phaseNumber === 4 || activity.phaseNumber === 5;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      {/* Accordion header */}
      <button
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
          open ? "bg-gray-50 border-b border-gray-100" : "hover:bg-gray-50/60"
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0f1e35]/10 text-xs font-semibold text-[#0f1e35]">
          {activity.order}
        </span>

        <span className="flex-1 font-medium text-sm text-gray-800">{activity.label}</span>

        <div className="flex items-center gap-2 shrink-0">
          {activity.sla && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {activity.sla} {activity.dayType === "calendardays" ? "cal" : "bus"} days
            </span>
          )}
          {activity.sourceSystem && (
            <span className="rounded px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500">
              {activity.sourceSystem}
            </span>
          )}
          {tracking && (
            <Badge variant={statusVariant(tracking.status)}>
              {STATUS_OPTIONS.find((s) => s.value === tracking.status)?.label ?? tracking.status}
            </Badge>
          )}
          {riskStatus && (
            <Badge
              variant={
                riskStatus === "On Time" ? "on-time"
                : riskStatus === "On Risk" ? "at-risk"
                : "delayed"
              }
            >
              {riskStatus}
            </Badge>
          )}
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="p-5 bg-gray-50/30 space-y-5">
          {activity.sourceSystem === "ServiceNow" && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2">
              This milestone is managed by ServiceNow (read-only).
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Owner */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Owner / Assignee</Label>
              <Select
                value={form.assignedTo}
                onValueChange={(v) => set("assignedTo", v === "_none" ? "" : v)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign owner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Unassigned —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.assignedTo && (
                <p className="text-xs text-gray-400">
                  {users.find((u) => u.id === form.assignedTo)?.email ?? ""}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <Select
                value={form.status}
                onValueChange={handleStatusChange}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Due Date
                {activity.sla && (
                  <span className="ml-1 text-xs text-gray-400 font-normal">
                    (SLA: {activity.sla} {activity.dayType === "calendardays" ? "calendar" : "business"} days)
                  </span>
                )}
              </Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {/* Planned End Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Planned End Date</Label>
              <Input
                type="date"
                value={form.plannedEndDate}
                onChange={(e) => set("plannedEndDate", e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {/* Completed Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Completed Date</Label>
              <Input
                type="date"
                value={form.completedDate}
                onChange={(e) => set("completedDate", e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="Add remarks or notes about this milestone..."
              rows={2}
              disabled={!canEdit}
            />
          </div>

          {/* Save button */}
          {canEdit && (
            <div className="flex items-center gap-3 justify-end pt-1">
              {saved && (
                <span className="text-xs text-green-600 font-medium">Saved successfully</span>
              )}
              <Button
                size="sm"
                onClick={save}
                disabled={saving}
                className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}

          {/* Attachments — only when capexId exists */}
          {capexId && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <FileUploadZone
                capExRequestId={capexId}
                sectionId="MilestoneActivitesFileupload"
                secondaryId={String(activity.id)}
                initialAttachments={initialDocs}
                disabled={!canEdit}
                label="Supported Documents"
              />

              {showImages && (
                <FileUploadZone
                  capExRequestId={capexId}
                  sectionId="MilestoneActivitesImageFileUpload"
                  secondaryId={String(activity.id)}
                  initialAttachments={initialImages}
                  disabled={!canEdit}
                  label="Site Progress Images"
                  accept="image/png,image/jpg,image/jpeg"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
