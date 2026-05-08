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
import {
  Save,
  Send,
  RefreshCw,
  Lock,
  AlertCircle,
  MessageSquare,
  Send as SendIcon,
  ShieldOff,
} from "lucide-react";

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
  securityTotal: number | null;
  securitySeats: number | null;
  isExistingInventoryEvaluatedSec: boolean | null;
  isCompetitiveBidSec: boolean | null;
  securityLeadApproverId: string | null;
  securityLeadApprovedById: string | null;
  securityLeadApproveStatus: string | null;
  securityApprovedDate: string | null;
  securitySessionStatus: string | null;
}

interface Props {
  prjId: string;
  capexId: string | null;
  project: {
    prjNumber: string;
    name: string;
    managerName: string | null;
    goLiveDate: string | null;
  };
  initialData: InitialData | null;
  capexState: string;
  isRCApproved: boolean;
  isPhysicalSecuritySelected: boolean;
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

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
        dangerouslySetInnerHTML={{
          __html: value || `<span class="text-gray-400">${placeholder ?? ""}</span>`,
        }}
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
            onMouseDown={(e) => {
              e.preventDefault();
              exec(cmd);
            }}
            className={`px-2 py-0.5 text-xs rounded hover:bg-gray-200 ${style}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
          }}
          className="px-2 py-0.5 text-xs rounded hover:bg-gray-200"
        >
          • List
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertOrderedList");
          }}
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
        style={{ minHeight: 120 }}
      />
    </div>
  );
}

export function SecurityForm({
  prjId,
  capexId,
  project,
  initialData,
  capexState,
  isRCApproved,
  isPhysicalSecuritySelected,
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
  const isSecurityManager = userRoles.includes("Security Manager");
  const isSecurityLeadership = userRoles.includes("Security Leadership");
  const isBusinessRequester =
    userRoles.includes("Business Manager") || userRoles.includes("Business Requester");
  const canEdit =
    isGovernanceManager || isSecurityManager || isSecurityLeadership || isBusinessRequester;
  const canApprove = isGovernanceManager || isSecurityManager || isSecurityLeadership;

  const sessionStatus = initialData?.securitySessionStatus ?? "Draft";
  const isDraft = sessionStatus === "Draft" || !initialData;
  const isSubmitted = sessionStatus === "Submitted" || sessionStatus === "Approved";
  const isReadOnly = isRCApproved || !canEdit;
  const costFieldsLocked = isSubmitted || isReadOnly;

  const [form, setForm] = useState({
    securityTotal: initialData?.securityTotal !== null && initialData?.securityTotal !== undefined
      ? String(initialData.securityTotal)
      : "",
    securitySeats: initialData?.securitySeats !== null && initialData?.securitySeats !== undefined
      ? String(initialData.securitySeats)
      : "",
    isExistingInventoryEvaluatedSec: initialData?.isExistingInventoryEvaluatedSec ?? null as boolean | null,
    isCompetitiveBidSec: initialData?.isCompetitiveBidSec ?? null as boolean | null,
    securityLeadApproverId: initialData?.securityLeadApproverId ?? "",
    securityLeadApprovedById: initialData?.securityLeadApprovedById ?? "",
    securityLeadApproveStatus: initialData?.securityLeadApproveStatus ?? "",
    securityApprovedDate: initialData?.securityApprovedDate ?? null as string | null,
    documentSummary: "",
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

  function handleStatusChange(value: string) {
    const resolved = value === "_none" ? "" : value;
    setField("securityLeadApproveStatus", resolved);
    if (resolved === "ApprovedbyLeadership" && canApprove) {
      setField("securityLeadApprovedById", currentUserId);
      setField("securityApprovedDate", new Date().toISOString());
    } else if (resolved !== "ApprovedbyLeadership") {
      setField("securityLeadApprovedById", "");
      setField("securityApprovedDate", null);
    }
  }

  // Derived
  const totalAmt = Number(form.securityTotal) || 0;
  const totalSeats = Number(form.securitySeats) || 0;
  const costPerSeat =
    totalAmt > 0 && totalSeats > 0
      ? `$${(totalAmt / totalSeats).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "—";

  const isApprovedStatus = form.securityLeadApproveStatus === "ApprovedbyLeadership";
  const approvedByUser = users.find((u) => u.id === form.securityLeadApprovedById);
  const leadApproverUser = users.find((u) => u.id === form.securityLeadApproverId);

  async function save(mode: "draft" | "submit" | "update") {
    if (mode === "draft") setSaving(true);
    else if (mode === "submit") setSubmitting(true);
    else setUpdating(true);

    const payload: Record<string, unknown> = {
      section: "security",
      securityTotal: form.securityTotal !== "" ? Number(form.securityTotal) : null,
      securitySeats: form.securitySeats !== "" ? Number(form.securitySeats) : null,
      isExistingInventoryEvaluatedSec: form.isExistingInventoryEvaluatedSec,
      isCompetitiveBidSec: form.isCompetitiveBidSec,
      securityLeadApproverId: form.securityLeadApproverId || null,
      securityLeadApprovedById: form.securityLeadApprovedById || null,
      securityLeadApproveStatus: form.securityLeadApproveStatus || null,
      securityApprovedDate: form.securityApprovedDate,
      ...(mode === "submit" && { securitySessionStatus: "Submitted" }),
    };

    try {
      const res = await fetch(`/api/projects/${prjId}/capex/section-details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        if (mode === "submit") {
          router.push(`/projects/${prjId}/capex/total`);
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
        body: JSON.stringify({ comment: newComment.trim(), categoryType: "SecurityPMSection" }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [
          {
            id: data.id,
            comments: data.comments,
            createdByName: currentUserName,
            createdOn: data.createdOn,
          },
          ...prev,
        ]);
        setNewComment("");
      }
    } finally {
      setAddingComment(false);
    }
  }

  // Section not enabled if Physical Security not selected in BPM
  if (!isPhysicalSecuritySelected) {
    return (
      <div className="space-y-6">
        <CapexFormHeader
          prjNumber={project.prjNumber}
          projectName={project.name}
          managerName={project.managerName}
          goLiveDate={project.goLiveDate}
          capexState={capexState}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldOff className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-base font-semibold text-gray-600 mb-2">
            Physical Security Not Selected
          </h3>
          <p className="text-sm text-gray-400 max-w-sm">
            The Physical Security section is only available when the{" "}
            <strong>Physical Security</strong> checkbox is selected in the CapEx Types &amp; BPM
            section.
          </p>
        </div>
      </div>
    );
  }

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
          <span>
            Security Summary has been submitted. Comments and Document Summary remain editable.
          </span>
        </div>
      )}

      {/* Security Cost Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Physical Security Cost Summary</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-48">Category</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-36">Total Amount ($)</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-36">No. of Seats / Hours</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-32">Cost Per Seat</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Physical Security</td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.securityTotal}
                    onChange={(e) => setField("securityTotal", e.target.value)}
                    disabled={costFieldsLocked}
                    className="text-right w-full"
                    placeholder="0.00"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0"
                    value={form.securitySeats}
                    onChange={(e) => setField("securitySeats", e.target.value)}
                    disabled={costFieldsLocked}
                    className="text-right w-full"
                    placeholder="0"
                  />
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-600">{costPerSeat}</td>
              </tr>
              {totalAmt > 0 && (
                <tr className="bg-[#0f1e35]/5 font-semibold text-gray-800">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">
                    ${totalAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">{totalSeats > 0 ? totalSeats : "—"}</td>
                  <td className="px-4 py-3 text-right">{costPerSeat}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Lead Approver */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Security Lead Approver</SectionTitle>
        <div
          className={`rounded-lg border p-4 ${
            isApprovedStatus ? "border-green-200 bg-green-50/30" : "border-gray-200"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Lead Approver dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Lead Approver
              </Label>
              {costFieldsLocked || !canApprove ? (
                <p className="text-sm text-gray-800">{leadApproverUser?.name ?? "—"}</p>
              ) : (
                <Select
                  value={form.securityLeadApproverId || "_none"}
                  onValueChange={(v) =>
                    setField("securityLeadApproverId", v === "_none" ? "" : v)
                  }
                  disabled={costFieldsLocked}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select approver..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None —</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
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
                <p className="text-sm text-gray-800">{form.securityLeadApproveStatus || "—"}</p>
              ) : (
                <Select
                  value={form.securityLeadApproveStatus || "_none"}
                  onValueChange={handleStatusChange}
                  disabled={isRCApproved}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Select —</SelectItem>
                    {LEAD_APPROVER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
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
                {isApprovedStatus ? approvedByUser?.name ?? currentUserName : "—"}
              </p>
            </div>

            {/* Approved Date — auto-filled */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Approved Date
              </Label>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2 border border-gray-200 min-h-[38px]">
                {isApprovedStatus ? formatDate(form.securityApprovedDate) : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Compliance</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              key: "isExistingInventoryEvaluatedSec" as const,
              label: "Is existing inventory evaluated / exhausted?",
            },
            {
              key: "isCompetitiveBidSec" as const,
              label: "Has this gone out to a competitive bid?",
            },
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
                      onChange={() => {
                        if (!costFieldsLocked) setField(key, v);
                      }}
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

      {/* Document Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Document Summary</SectionTitle>
        <SimpleRTE
          value={form.documentSummary}
          onChange={(v) => setField("documentSummary", v)}
          disabled={isRCApproved}
          placeholder="Enter document summary, screenshots, tables, or formatted notes..."
        />
      </div>

      {/* Comments */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Comments</SectionTitle>

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

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> No comments yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
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
            sectionId="AttachFilesSecurity"
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
          {saved && (
            <span className="text-sm text-green-600 font-medium">Saved successfully</span>
          )}

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
