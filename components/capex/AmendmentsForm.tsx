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
import { CapexFormHeader } from "./CapexFormHeader";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  Lock,
  AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Amendment {
  id: string;
  index: number;
  amendment: string | null;
  amendmentAmount: number | null;
  amendmentDate: string | null;
  note: string | null;
  leadApproverId: string | null;
  leadApproverName: string | null;
  leadApproveById: string | null;
  leadApprovedByName: string | null;
  leadApproveDate: string | null;
  approvalStatusId: string | null;
  status: string;
  createdOn: string;
  updatedOn: string;
}

interface BaseTotals {
  it: number;
  facilities: number;
  security: number;
  itSeats: number;
  facSeats: number;
  secSeats: number;
}

interface Props {
  prjId: string;
  capexId: string | null;
  project: { prjNumber: string; name: string; managerName: string | null; goLiveDate: string | null };
  baseTotals: BaseTotals;
  bpm: { isIt: boolean; isFacilities: boolean; isPhysicalSecurity: boolean } | null;
  capexState: string;
  capexIdGenerated: boolean;
  initialAmendments: Amendment[];
  approversBySection: {
    IT: { id: string; name: string }[];
    Facilities: { id: string; name: string }[];
    "Physical Security": { id: string; name: string }[];
  };
  userRoles: string[];
  currentUserId: string;
  currentUserName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AMENDMENT_SECTIONS = ["IT", "Facilities", "Physical Security"] as const;
type AmendSection = (typeof AMENDMENT_SECTIONS)[number];

const STATUS_OPTIONS = ["InProgress", "Approved", "Rejected"] as const;

const SECTION_APPROVER_LABEL: Record<string, string> = {
  IT: "IT Lead Approver",
  Facilities: "Facilities Lead Approver",
  "Physical Security": "Security Lead Approver",
};

const SECTION_APPROVE_ROLE: Record<string, string> = {
  IT: "IT Leadership",
  Facilities: "Facilities Leadership",
  "Physical Security": "Security Leadership",
};

function fmt(v: number): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtNum(v: number): string {
  if (!v) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function cps(amount: number, seats: number): string {
  if (!seats || !amount) return "—";
  return fmt(amount / seats);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(
  status: string
): "completed" | "pending" | "delayed" | "in-progress" {
  if (status === "Approved") return "completed";
  if (status === "Rejected") return "delayed";
  if (status === "InProgress") return "in-progress";
  return "pending";
}

// ─── Amendment Card ───────────────────────────────────────────────────────────

interface CardProps {
  amendment: Amendment;
  index: number;
  prjId: string;
  approversBySection: Props["approversBySection"];
  canManage: boolean;
  canApproveSection: (section: string) => boolean;
  currentUserId: string;
  currentUserName: string;
  onChange: (updated: Amendment) => void;
  onDelete: (id: string) => void;
}

function AmendmentCard({
  amendment,
  index,
  prjId,
  approversBySection,
  canManage,
  canApproveSection,
  currentUserId,
  currentUserName,
  onChange,
  onDelete,
}: CardProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amendment: amendment.amendment ?? "",
    amendmentAmount: amendment.amendmentAmount !== null ? String(amendment.amendmentAmount) : "",
    note: amendment.note ?? "",
    leadApproverId: amendment.leadApproverId ?? "",
    approvalStatusId: amendment.approvalStatusId ?? "",
    leadApproveById: amendment.leadApproveById ?? "",
    leadApprovedByName: amendment.leadApprovedByName ?? "",
    leadApproveDate: amendment.leadApproveDate ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isApproved = form.approvalStatusId === "Approved" || amendment.status === "Approved";
  const sectionCanApprove = form.amendment ? canApproveSection(form.amendment) : false;

  // Editable if canManage and not yet approved
  const fieldsEditable = canManage && !isApproved;
  const statusEditable = sectionCanApprove && !isApproved;

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleStatusChange(value: string) {
    const newStatus = value === "_none" ? "" : value;
    const isApprovingNow = newStatus === "Approved";
    setForm((f) => ({
      ...f,
      approvalStatusId: newStatus,
      ...(isApprovingNow
        ? {
            leadApproveById: currentUserId,
            leadApprovedByName: currentUserName,
            leadApproveDate: new Date().toISOString(),
          }
        : {}),
    }));
    setSaved(false);
  }

  // Approvers for selected section
  const sectionApprovers =
    (form.amendment as AmendSection) in approversBySection
      ? approversBySection[form.amendment as AmendSection]
      : [];
  const approverLabel = form.amendment
    ? (SECTION_APPROVER_LABEL[form.amendment] ?? "Lead Approver")
    : "Lead Approver";

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        id: amendment.id,
        amendment: form.amendment || null,
        amendmentAmount:
          form.amendmentAmount !== "" ? Number(form.amendmentAmount) : null,
        note: form.note || null,
        leadApproverId: form.leadApproverId || null,
        approvalStatusId: form.approvalStatusId || null,
        status: form.approvalStatusId || amendment.status,
      };
      if (form.leadApproveById) {
        payload.leadApproveById = form.leadApproveById;
        payload.leadApproveDate = form.leadApproveDate;
      }
      const res = await fetch(`/api/projects/${prjId}/capex/amendments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSaved(true);
        onChange({
          ...amendment,
          amendment: updated.amendment ?? null,
          amendmentAmount: updated.amendmentAmount
            ? Number(updated.amendmentAmount)
            : null,
          note: updated.note ?? null,
          leadApproverId: updated.leadApproverId ?? null,
          leadApproverName: updated.leadApprover?.name ?? amendment.leadApproverName,
          leadApproveById: updated.leadApproveById ?? null,
          leadApprovedByName:
            form.leadApprovedByName || amendment.leadApprovedByName,
          leadApproveDate: updated.leadApproveDate ?? null,
          approvalStatusId: updated.approvalStatusId ?? null,
          status: updated.status,
          updatedOn: updated.updatedOn,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/projects/${prjId}/capex/amendments?id=${amendment.id}`, {
      method: "DELETE",
    });
    onDelete(amendment.id);
  }

  const sectionLabel = form.amendment || "Not set";
  const amountDisplay =
    amendment.amendmentAmount !== null
      ? fmt(amendment.amendmentAmount)
      : "No amount";

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-gray-400 shrink-0">
            #{index}
          </span>
          <Badge variant={statusVariant(amendment.status)}>
            {amendment.status}
          </Badge>
          <span className="font-medium text-gray-800 text-sm">
            {form.amendment || "New Amendment"}
          </span>
          {amendment.amendmentAmount !== null && (
            <span className="text-sm font-semibold text-gray-600">
              {amountDisplay}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto shrink-0">
            {fmtDate(amendment.createdOn)}
          </span>
        </div>
        <div className="ml-3 shrink-0">
          {open ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-gray-100 p-5 bg-gray-50/20 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amendment Section */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Amended Section
              </Label>
              <Select
                value={form.amendment || "_none"}
                onValueChange={(v) => {
                  set("amendment", v === "_none" ? "" : v);
                  // Reset approver when section changes
                  set("leadApproverId", "");
                }}
                disabled={!fieldsEditable}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Select section —</SelectItem>
                  {AMENDMENT_SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amendment Amount */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Amendment Amount ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={form.amendmentAmount}
                onChange={(e) => set("amendmentAmount", e.target.value)}
                disabled={!fieldsEditable}
                placeholder="0.00"
              />
            </div>

            {/* Lead Approver */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                {approverLabel}
              </Label>
              <Select
                value={form.leadApproverId || "_none"}
                onValueChange={(v) =>
                  set("leadApproverId", v === "_none" ? "" : v)
                }
                disabled={!fieldsEditable || !form.amendment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {sectionApprovers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.amendment && sectionApprovers.length === 0 && (
                <p className="text-xs text-amber-600">
                  No {SECTION_APPROVER_LABEL[form.amendment] ?? "approvers"} found.
                </p>
              )}
            </div>

            {/* Approval Status */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Approval Status
              </Label>
              <Select
                value={form.approvalStatusId || "_none"}
                onValueChange={handleStatusChange}
                disabled={!statusEditable}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!statusEditable && form.amendment && (
                <p className="text-xs text-gray-400">
                  Only {SECTION_APPROVE_ROLE[form.amendment] ?? "leadership"} can
                  update status
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Notes</Label>
            <Textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              disabled={!fieldsEditable}
              rows={3}
              placeholder="Amendment justification / comments..."
            />
          </div>

          {/* Audit info */}
          <div className="rounded-md bg-gray-50 border border-gray-100 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-0.5">
                Created
              </p>
              <p className="text-gray-700 font-medium">{fmtDate(amendment.createdOn)}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-0.5">
                Updated
              </p>
              <p className="text-gray-700 font-medium">
                {fmtDate(amendment.updatedOn)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-0.5">
                Approved By
              </p>
              <p className="text-gray-700 font-medium">
                {form.leadApprovedByName || amendment.leadApprovedByName || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-0.5">
                Approval Date
              </p>
              <p className="text-gray-700 font-medium">
                {fmtDate(form.leadApproveDate || amendment.leadApproveDate)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {(fieldsEditable || statusEditable) && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-sm text-green-600">Saved</span>
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
              {fieldsEditable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AmendmentsForm({
  prjId,
  project,
  baseTotals,
  bpm,
  capexState,
  capexIdGenerated,
  initialAmendments,
  approversBySection,
  userRoles,
  currentUserId,
  currentUserName,
}: Props) {
  const [amendments, setAmendments] = useState<Amendment[]>(initialAmendments);
  const [adding, setAdding] = useState(false);
  const [validationMsg, setValidationMsg] = useState("");

  const canManage = userRoles.some((r) =>
    ["Governance Manager", "Business Manager"].includes(r)
  );

  function canApproveSection(section: string): boolean {
    const requiredRole = SECTION_APPROVE_ROLE[section];
    return !!requiredRole && userRoles.includes(requiredRole);
  }

  // ─── Computed totals ────────────────────────────────────────────────────────

  function approvedAmendmentsFor(section: string): number {
    return amendments
      .filter(
        (a) =>
          a.amendment === section &&
          (a.approvalStatusId === "Approved" || a.status === "Approved")
      )
      .reduce((sum, a) => sum + (a.amendmentAmount ?? 0), 0);
  }

  const adjIT = baseTotals.it + approvedAmendmentsFor("IT");
  const adjFac = baseTotals.facilities + approvedAmendmentsFor("Facilities");
  const adjSec = baseTotals.security + approvedAmendmentsFor("Physical Security");
  const adjGrand = adjIT + adjFac + adjSec;
  const totalSeats = baseTotals.itSeats + baseTotals.facSeats + baseTotals.secSeats;

  // ─── Validation ──────────────────────────────────────────────────────────────

  function checkDuplicateInProgress(section: string): string {
    const inProgress = amendments.find(
      (a) =>
        a.amendment === section &&
        a.status !== "Approved" &&
        a.status !== "Rejected" &&
        a.approvalStatusId !== "Approved" &&
        a.approvalStatusId !== "Rejected"
    );
    if (!inProgress) return "";
    const labelMap: Record<string, string> = {
      IT: "IT",
      Facilities: "Facilities",
      "Physical Security": "Physical Security",
    };
    return `An ${labelMap[section] ?? section} amendment is already in progress. Please complete the existing amendment before creating a new one.`;
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function addAmendment() {
    setValidationMsg("");
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${prjId}/capex/amendments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "InProgress" }),
      });
      if (res.ok) {
        const a = await res.json();
        setAmendments((prev) => [
          ...prev,
          {
            id: a.id,
            index: prev.length + 1,
            amendment: a.amendment ?? null,
            amendmentAmount: a.amendmentAmount
              ? Number(a.amendmentAmount)
              : null,
            amendmentDate: a.amendmentDate ?? null,
            note: a.note ?? null,
            leadApproverId: a.leadApproverId ?? null,
            leadApproverName: a.leadApprover?.name ?? null,
            leadApproveById: a.leadApproveById ?? null,
            leadApprovedByName: null,
            leadApproveDate: a.leadApproveDate ?? null,
            approvalStatusId: a.approvalStatusId ?? null,
            status: a.status,
            createdOn: a.createdOn,
            updatedOn: a.updatedOn,
          },
        ]);
      }
    } finally {
      setAdding(false);
    }
  }

  function handleAmendmentChange(updated: Amendment) {
    setAmendments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  }

  function handleAmendmentDelete(id: string) {
    setAmendments((prev) => prev.filter((a) => a.id !== id));
  }

  // Validate before showing "Add Amendment" — warn if all sections in progress
  function handleAddClick() {
    setValidationMsg("");
    // We can't pre-validate section since user selects section inside the card
    // but we validate when saving inside AmendmentCard
    addAmendment();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <CapexFormHeader
        prjNumber={project.prjNumber}
        projectName={project.name}
        managerName={project.managerName}
        goLiveDate={project.goLiveDate}
        capexState={capexState}
      />

      {/* Locked state — no CapEx ID yet */}
      {!capexIdGenerated && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Amendments Locked
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Amendments are only available after the Project CapEx Number has
              been generated in the Finance Review section.
            </p>
          </div>
        </div>
      )}

      {/* Amendment Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
          Amendment Summary
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                Category
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">
                Base Total
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">
                Amendments
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">
                Adjusted Total
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">
                Seats/Hrs
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">
                Cost/Seat
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bpm?.isIt && (
              <tr>
                <td className="px-3 py-2.5 text-gray-700">IT</td>
                <td className="px-3 py-2.5 text-right text-gray-500">
                  {fmt(baseTotals.it)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-medium ${
                    approvedAmendmentsFor("IT") >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {approvedAmendmentsFor("IT") !== 0
                    ? (approvedAmendmentsFor("IT") > 0 ? "+" : "") +
                      fmt(approvedAmendmentsFor("IT"))
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-medium">
                  {fmt(adjIT)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {fmtNum(baseTotals.itSeats)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {cps(adjIT, baseTotals.itSeats)}
                </td>
              </tr>
            )}
            {bpm?.isFacilities && (
              <tr>
                <td className="px-3 py-2.5 text-gray-700">
                  Facilities (Net of TIA)
                </td>
                <td className="px-3 py-2.5 text-right text-gray-500">
                  {fmt(baseTotals.facilities)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-medium ${
                    approvedAmendmentsFor("Facilities") >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {approvedAmendmentsFor("Facilities") !== 0
                    ? (approvedAmendmentsFor("Facilities") > 0 ? "+" : "") +
                      fmt(approvedAmendmentsFor("Facilities"))
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-medium">
                  {fmt(adjFac)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {fmtNum(baseTotals.facSeats)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {cps(adjFac, baseTotals.facSeats)}
                </td>
              </tr>
            )}
            {bpm?.isPhysicalSecurity && (
              <tr>
                <td className="px-3 py-2.5 text-gray-700">Physical Security</td>
                <td className="px-3 py-2.5 text-right text-gray-500">
                  {fmt(baseTotals.security)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-medium ${
                    approvedAmendmentsFor("Physical Security") >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {approvedAmendmentsFor("Physical Security") !== 0
                    ? (approvedAmendmentsFor("Physical Security") > 0 ? "+" : "") +
                      fmt(approvedAmendmentsFor("Physical Security"))
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-medium">
                  {fmt(adjSec)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {fmtNum(baseTotals.secSeats)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {cps(adjSec, baseTotals.secSeats)}
                </td>
              </tr>
            )}
            <tr className="bg-[#0f1e35] text-white font-semibold">
              <td className="px-3 py-3">Grand Total</td>
              <td className="px-3 py-3 text-right">
                {fmt(baseTotals.it + baseTotals.facilities + baseTotals.security)}
              </td>
              <td className="px-3 py-3 text-right">
                {approvedAmendmentsFor("IT") +
                  approvedAmendmentsFor("Facilities") +
                  approvedAmendmentsFor("Physical Security") !==
                0
                  ? (approvedAmendmentsFor("IT") +
                      approvedAmendmentsFor("Facilities") +
                      approvedAmendmentsFor("Physical Security") >
                    0
                      ? "+"
                      : "") +
                    fmt(
                      approvedAmendmentsFor("IT") +
                        approvedAmendmentsFor("Facilities") +
                        approvedAmendmentsFor("Physical Security")
                    )
                  : "—"}
              </td>
              <td className="px-3 py-3 text-right">{fmt(adjGrand)}</td>
              <td className="px-3 py-3 text-right">{fmtNum(totalSeats)}</td>
              <td className="px-3 py-3 text-right">{cps(adjGrand, totalSeats)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amendments list */}
      <div
        className={
          !capexIdGenerated ? "opacity-50 pointer-events-none select-none" : ""
        }
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Amendments ({amendments.length})
          </h3>
          {canManage && capexIdGenerated && (
            <Button
              size="sm"
              onClick={handleAddClick}
              disabled={adding}
              className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
            >
              <Plus className="h-3.5 w-3.5" />
              {adding ? "Adding..." : "Add Amendment"}
            </Button>
          )}
        </div>

        {validationMsg && (
          <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{validationMsg}</span>
          </div>
        )}

        {amendments.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-14 text-center">
            <p className="text-sm text-gray-400">No amendments yet.</p>
            {canManage && capexIdGenerated && (
              <p className="text-xs text-gray-400 mt-1">
                Click "Add Amendment" to create one.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {amendments.map((a, i) => (
              <AmendmentCard
                key={a.id}
                amendment={a}
                index={i + 1}
                prjId={prjId}
                approversBySection={approversBySection}
                canManage={canManage}
                canApproveSection={canApproveSection}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onChange={handleAmendmentChange}
                onDelete={handleAmendmentDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
