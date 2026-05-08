"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CapexFormHeader } from "./CapexFormHeader";
import { FileUploadZone } from "./FileUploadZone";
import { Save, Send, RefreshCw, Lock, AlertCircle, MessageSquare, Send as SendIcon } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface CommentEntry {
  id: string;
  comments: string | null;
  createdByName: string;
  createdOn: string;
}

interface Attachment {
  id: string;
  fileName: string;
  fileContent: string;
}

interface InitialData {
  infrastructureCostTotal: number | null;
  infrastructureCostSeats: number | null;
  eusCostTotal: number | null;
  eusCostSeats: number | null;
  capitalLaborCostTotal: number | null;
  capitalLaborCostSeats: number | null;
  isExistingInventoryEvaluatedIT: boolean | null;
  isCompetitiveBidIT: boolean | null;
  infrastructureLeadApproverId: string | null;
  infrastructureLeadStatus: string | null;
  infrastructureLeadApprovedById: string | null;
  infrastructureLeadApprovedDate: string | null;
  eusLeadApproverId: string | null;
  eusStatus: string | null;
  eusApprovedById: string | null;
  eusApprovedDate: string | null;
  capitalLaborLeadApproverId: string | null;
  capitalLaborLeadStatus: string | null;
  capitalLaborApprovedById: string | null;
  capitalLaborApprovedDate: string | null;
  documentSummary: string | null;
  itSessionStatus: string | null;
}

interface Props {
  prjId: string;
  capexId: string | null;
  project: { prjNumber: string; name: string; managerName: string | null; goLiveDate: string | null };
  initialData: InitialData | null;
  capexState: string;
  isRCApproved: boolean;
  userRoles: string[];
  currentUserName: string;
  currentUserId: string;
  users: User[];
  initialComments: CommentEntry[];
  initialAttachments: Attachment[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
      {children}
    </h3>
  );
}

function fmt(v: number | string | null | undefined): string {
  if (v === null || v === "" || v === undefined) return "";
  return String(v);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

const LEAD_APPROVER_STATUSES = ["InProgress", "Completed", "ApprovedbyLeadership"];

// Simple Rich Text Editor (no external deps)
function SimpleRTE({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
  }

  if (disabled) {
    return (
      <div
        className="min-h-[120px] rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: value || `<span class="text-gray-400">${placeholder ?? ""}</span>` }}
      />
    );
  }

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <div className="flex flex-wrap gap-0.5 bg-gray-50 border-b border-gray-200 px-2 py-1">
        {[
          { cmd: "bold", label: "B", style: "font-bold" },
          { cmd: "italic", label: "I", style: "italic" },
          { cmd: "underline", label: "U", style: "underline" },
        ].map(({ cmd, label, style }) => (
          <button
            key={cmd}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
            className={`px-2 py-0.5 text-xs rounded hover:bg-gray-200 ${style}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }}
          className="px-2 py-0.5 text-xs rounded hover:bg-gray-200"
        >
          • List
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }}
          className="px-2 py-0.5 text-xs rounded hover:bg-gray-200"
        >
          1. List
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = prompt("Enter URL:");
            if (url) exec("createLink", url);
          }}
          className="px-2 py-0.5 text-xs rounded hover:bg-gray-200"
        >
          Link
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        className="min-h-[120px] px-3 py-2 text-sm outline-none prose prose-sm max-w-none"
        data-placeholder={placeholder}
        style={{ minHeight: 120 }}
      />
    </div>
  );
}

export function ItForm({
  prjId,
  capexId,
  project,
  initialData,
  capexState,
  isRCApproved,
  userRoles,
  currentUserName,
  currentUserId,
  users,
  initialComments,
  initialAttachments,
}: Props) {
  const router = useRouter();

  // Role flags
  const isGovernanceManager = userRoles.includes("Governance Manager");
  const isITManager = userRoles.includes("IT Manager");
  const isITLeadership = userRoles.includes("IT Leadership");
  const isBusinessRequester = userRoles.includes("Business Manager") || userRoles.includes("Business Requester");
  const canEdit = isGovernanceManager || isITManager || isITLeadership || isBusinessRequester;
  const canApprove = isGovernanceManager || isITManager || isITLeadership;

  const sessionStatus = initialData?.itSessionStatus ?? "Draft";
  const isDraft = sessionStatus === "Draft" || !initialData;
  const isSubmitted = sessionStatus === "Submitted" || sessionStatus === "Approved";
  const isReadOnly = isRCApproved || !canEdit;
  // Even after submit, comments + document summary + update remain editable until RC approval
  const costFieldsLocked = isSubmitted || isReadOnly;

  const [form, setForm] = useState({
    infrastructureCostTotal: fmt(initialData?.infrastructureCostTotal),
    infrastructureCostSeats: fmt(initialData?.infrastructureCostSeats),
    eusCostTotal: fmt(initialData?.eusCostTotal),
    eusCostSeats: fmt(initialData?.eusCostSeats),
    capitalLaborCostTotal: fmt(initialData?.capitalLaborCostTotal),
    capitalLaborCostSeats: fmt(initialData?.capitalLaborCostSeats),
    isExistingInventoryEvaluatedIT: initialData?.isExistingInventoryEvaluatedIT ?? null as boolean | null,
    isCompetitiveBidIT: initialData?.isCompetitiveBidIT ?? null as boolean | null,
    infrastructureLeadApproverId: initialData?.infrastructureLeadApproverId ?? "",
    infrastructureLeadStatus: initialData?.infrastructureLeadStatus ?? "",
    infrastructureLeadApprovedById: initialData?.infrastructureLeadApprovedById ?? "",
    infrastructureLeadApprovedDate: initialData?.infrastructureLeadApprovedDate ?? null as string | null,
    eusLeadApproverId: initialData?.eusLeadApproverId ?? "",
    eusStatus: initialData?.eusStatus ?? "",
    eusApprovedById: initialData?.eusApprovedById ?? "",
    eusApprovedDate: initialData?.eusApprovedDate ?? null as string | null,
    capitalLaborLeadApproverId: initialData?.capitalLaborLeadApproverId ?? "",
    capitalLaborLeadStatus: initialData?.capitalLaborLeadStatus ?? "",
    capitalLaborApprovedById: initialData?.capitalLaborApprovedById ?? "",
    capitalLaborApprovedDate: initialData?.capitalLaborApprovedDate ?? null as string | null,
    documentSummary: initialData?.documentSummary ?? "",
  });

  const [comments, setComments] = useState<CommentEntry[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleStatusChange(
    statusKey: "infrastructureLeadStatus" | "eusStatus" | "capitalLaborLeadStatus",
    approvedByKey: "infrastructureLeadApprovedById" | "eusApprovedById" | "capitalLaborApprovedById",
    dateKey: "infrastructureLeadApprovedDate" | "eusApprovedDate" | "capitalLaborApprovedDate",
    value: string
  ) {
    setField(statusKey, value === "_none" ? "" : value);
    if (value === "ApprovedbyLeadership" && canApprove) {
      setField(approvedByKey, currentUserId);
      setField(dateKey, new Date().toISOString());
    }
  }

  // Derived totals
  const infraTotal = Number(form.infrastructureCostTotal) || 0;
  const eusTotal = Number(form.eusCostTotal) || 0;
  const capLaborTotal = Number(form.capitalLaborCostTotal) || 0;
  const grandTotal = infraTotal + eusTotal + capLaborTotal;

  const infraSeats = Number(form.infrastructureCostSeats) || 0;
  const eusSeats = Number(form.eusCostSeats) || 0;
  const capLaborSeats = Number(form.capitalLaborCostSeats) || 0;
  const activeRows = [infraSeats > 0, eusSeats > 0, capLaborSeats > 0].filter(Boolean).length;
  const avgSeats = activeRows > 0 ? (infraSeats + eusSeats + capLaborSeats) / 3 : 0;
  const avgCostPerSeat = avgSeats > 0 ? grandTotal / avgSeats : 0;

  function fmtMoney(v: number) {
    return v > 0
      ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—";
  }

  function costPerSeat(total: string, seats: string) {
    const t = Number(total);
    const s = Number(seats);
    if (!t || !s) return "—";
    return `$${(t / s).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function save(mode: "draft" | "submit" | "update") {
    if (mode === "draft") setSaving(true);
    else if (mode === "submit") setSubmitting(true);
    else setUpdating(true);

    const numericFields = [
      "infrastructureCostTotal", "infrastructureCostSeats",
      "eusCostTotal", "eusCostSeats",
      "capitalLaborCostTotal", "capitalLaborCostSeats",
    ];

    const payload: Record<string, unknown> = {
      section: "it",
      ...form,
      ...(mode === "submit" && { itSessionStatus: "Submitted" }),
    };

    for (const f of numericFields) {
      payload[f] = payload[f] !== "" ? Number(payload[f]) : null;
    }

    for (const k of [
      "infrastructureLeadApproverId", "eusLeadApproverId", "capitalLaborLeadApproverId",
      "infrastructureLeadStatus", "eusStatus", "capitalLaborLeadStatus",
      "infrastructureLeadApprovedById", "eusApprovedById", "capitalLaborApprovedById",
    ]) {
      if (payload[k] === "") payload[k] = null;
    }

    try {
      const res = await fetch(`/api/projects/${prjId}/capex/section-details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        if (mode === "submit") {
          router.push(`/projects/${prjId}/capex/functional/facilities`);
          router.refresh();
        } else {
          router.refresh();
        }
      }
    } finally {
      setSaving(false);
      setSubmitting(false);
      setUpdating(false);
    }
  }

  async function addComment() {
    if (!newComment.trim() || !capexId) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/projects/${prjId}/capex/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment.trim(), categoryType: "ITPMSection" }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [
          { id: data.id, comments: data.comments, createdByName: currentUserName, createdOn: data.createdOn },
          ...prev,
        ]);
        setNewComment("");
      }
    } finally {
      setAddingComment(false);
    }
  }

  const approverRows: {
    key: "infrastructure" | "eus" | "capitalLabor";
    label: string;
    totalKey: keyof typeof form;
    approverKey: "infrastructureLeadApproverId" | "eusLeadApproverId" | "capitalLaborLeadApproverId";
    statusKey: "infrastructureLeadStatus" | "eusStatus" | "capitalLaborLeadStatus";
    approvedByKey: "infrastructureLeadApprovedById" | "eusApprovedById" | "capitalLaborApprovedById";
    dateKey: "infrastructureLeadApprovedDate" | "eusApprovedDate" | "capitalLaborApprovedDate";
    approverName: string;
  }[] = [
    {
      key: "infrastructure",
      label: "Infrastructure Lead Approver",
      totalKey: "infrastructureCostTotal",
      approverKey: "infrastructureLeadApproverId",
      statusKey: "infrastructureLeadStatus",
      approvedByKey: "infrastructureLeadApprovedById",
      dateKey: "infrastructureLeadApprovedDate",
      approverName: users.find((u) => u.id === form.infrastructureLeadApproverId)?.name ?? "—",
    },
    {
      key: "eus",
      label: "EUS Lead Approver",
      totalKey: "eusCostTotal",
      approverKey: "eusLeadApproverId",
      statusKey: "eusStatus",
      approvedByKey: "eusApprovedById",
      dateKey: "eusApprovedDate",
      approverName: users.find((u) => u.id === form.eusLeadApproverId)?.name ?? "—",
    },
    {
      key: "capitalLabor",
      label: "Capital Labor Lead Approver",
      totalKey: "capitalLaborCostTotal",
      approverKey: "capitalLaborLeadApproverId",
      statusKey: "capitalLaborLeadStatus",
      approvedByKey: "capitalLaborApprovedById",
      dateKey: "capitalLaborApprovedDate",
      approverName: users.find((u) => u.id === form.capitalLaborLeadApproverId)?.name ?? "—",
    },
  ];

  return (
    <div className="space-y-6">
      <CapexFormHeader
        prjNumber={project.prjNumber}
        projectName={project.name}
        managerName={project.managerName}
        goLiveDate={project.goLiveDate}
        capexState={capexState}
      />

      {isRCApproved && (
        <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This section is read-only — RC Finance approval has been completed.</span>
        </div>
      )}

      {isSubmitted && !isRCApproved && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>IT Summary has been submitted. Comments and Document Summary remain editable.</span>
        </div>
      )}

      {/* IT Cost Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>IT Cost Summary</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-44">Cost Category</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-36">Amount ($)</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-32">No. of Seats / Hours</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-32">Cost Per Seat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { label: "Infrastructure Cost", totalKey: "infrastructureCostTotal" as const, seatsKey: "infrastructureCostSeats" as const },
                { label: "EUS Cost", totalKey: "eusCostTotal" as const, seatsKey: "eusCostSeats" as const },
                { label: "Capital Labor Cost", totalKey: "capitalLaborCostTotal" as const, seatsKey: "capitalLaborCostSeats" as const },
              ].map((row) => (
                <tr key={row.label} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form[row.totalKey]}
                      onChange={(e) => setField(row.totalKey, e.target.value)}
                      disabled={costFieldsLocked}
                      className="text-right w-full"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min="0"
                      value={form[row.seatsKey]}
                      onChange={(e) => setField(row.seatsKey, e.target.value)}
                      disabled={costFieldsLocked}
                      className="text-right w-full"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 font-medium">
                    {costPerSeat(form[row.totalKey], form[row.seatsKey])}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-[#0f1e35]/5 font-semibold text-gray-800">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{fmtMoney(grandTotal)}</td>
                <td className="px-4 py-3 text-right">
                  {avgSeats > 0 ? avgSeats.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {avgCostPerSeat > 0 ? fmtMoney(avgCostPerSeat) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Lead Approver Sections */}
      {approverRows.some((r) => Number(form[r.totalKey]) > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <SectionTitle>Lead Approvals</SectionTitle>
          {approverRows.map((row) => {
            const amount = Number(form[row.totalKey]) || 0;
            if (amount <= 0) return null;
            const approvedByUser = users.find((u) => u.id === form[row.approvedByKey]);
            const isApprovedStatus = form[row.statusKey] === "ApprovedbyLeadership";

            return (
              <div
                key={row.key}
                className={`rounded-lg border p-4 ${
                  isApprovedStatus ? "border-green-200 bg-green-50/30" : "border-gray-200"
                }`}
              >
                <p className="text-sm font-semibold text-gray-700 mb-3">{row.label}</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Lead Approver dropdown */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Lead Approver
                    </Label>
                    {costFieldsLocked || !canApprove ? (
                      <p className="text-sm text-gray-800">{row.approverName}</p>
                    ) : (
                      <Select
                        value={form[row.approverKey] || "_none"}
                        onValueChange={(v) => setField(row.approverKey, v === "_none" ? "" : v)}
                        disabled={costFieldsLocked}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select approver..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Status dropdown */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </Label>
                    {isReadOnly ? (
                      <p className="text-sm text-gray-800">{form[row.statusKey] || "—"}</p>
                    ) : (
                      <Select
                        value={form[row.statusKey] || "_none"}
                        onValueChange={(v) =>
                          handleStatusChange(row.statusKey, row.approvedByKey, row.dateKey, v)
                        }
                        disabled={isRCApproved}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Status..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— Select —</SelectItem>
                          {LEAD_APPROVER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Approved By — auto-filled */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Approved By
                    </Label>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2 border border-gray-200 min-h-[38px]">
                      {isApprovedStatus
                        ? approvedByUser?.name ?? currentUserName
                        : "—"}
                    </p>
                  </div>

                  {/* Approved Date — auto-filled */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Approved Date
                    </Label>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2 border border-gray-200 min-h-[38px]">
                      {isApprovedStatus ? formatDate(form[row.dateKey]) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compliance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Compliance</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { key: "isExistingInventoryEvaluatedIT" as const, label: "Is existing inventory evaluated / exhausted?" },
            { key: "isCompetitiveBidIT" as const, label: "Has this gone out to a competitive bid?" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{label}</Label>
              <div className="flex gap-6">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={key}
                      checked={form[key] === v}
                      onChange={() => { if (!costFieldsLocked) setField(key, v); }}
                      disabled={costFieldsLocked}
                      className="h-4 w-4 accent-[#0f1e35]"
                    />
                    <span className="text-sm">{v ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Summary RTE */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Document Summary</SectionTitle>
        <SimpleRTE
          value={form.documentSummary}
          onChange={(v) => setField("documentSummary", v)}
          disabled={isRCApproved}
          placeholder="Enter document summary, screenshots, tables, or formatted notes..."
        />
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Comments</SectionTitle>

        {/* Add comment */}
        {!isRCApproved && (
          <div className="flex gap-2 mb-5">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="flex-1 text-sm rounded-md border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0f1e35]/20"
            />
            <Button
              type="button"
              size="sm"
              onClick={addComment}
              disabled={addingComment || !newComment.trim() || !capexId}
              className="self-end bg-[#0f1e35] hover:bg-[#1a2f4f] gap-1.5"
            >
              <SendIcon className="h-3.5 w-3.5" />
              {addingComment ? "Adding..." : "Add"}
            </Button>
          </div>
        )}

        {/* Comment history */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> No comments yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{c.createdByName}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(c.createdOn)}</span>
                </div>
                <p className="text-sm text-gray-700">{c.comments}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Attachments</SectionTitle>
        {capexId ? (
          <FileUploadZone
            capExRequestId={capexId}
            sectionId="AttachFilesIT"
            initialAttachments={initialAttachments}
            disabled={isRCApproved}
            label=""
          />
        ) : (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Save a draft in Request Details first to enable file uploads.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {!isRCApproved && canEdit && (
        <div className="flex items-center gap-3 justify-end">
          {saved && <span className="text-sm text-green-600 font-medium">Saved successfully</span>}

          {isDraft ? (
            <>
              <Button
                variant="outline"
                onClick={() => save("draft")}
                disabled={saving || submitting}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                onClick={() => save("submit")}
                disabled={saving || submitting}
                className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => save("update")}
              disabled={updating}
              className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
            >
              <RefreshCw className="h-4 w-4" />
              {updating ? "Updating..." : "Update"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
