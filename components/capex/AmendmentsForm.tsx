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
import { Plus, ChevronDown, ChevronUp, Trash2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Amendment {
  id: string;
  amendment: string | null;
  amendmentAmount: number | null;
  note: string | null;
  leadApproverId: string | null;
  leadApproverName: string | null;
  approvalStatusId: string | null;
  status: string;
  createdOn: string;
}

interface Props {
  prjId: string;
  project: { prjNumber: string; name: string; managerName: string | null; goLiveDate: string | null };
  grandTotal: number;
  capexState: string;
  initialAmendments: Amendment[];
  users: { id: string; name: string; email: string }[];
}

const AMENDMENT_SECTIONS = [
  "IT", "Facilities", "Physical Security", "Other",
];

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "InProgress"];

function statusVariant(status: string): "completed" | "pending" | "delayed" | "in-progress" {
  if (status === "Approved") return "completed";
  if (status === "Rejected") return "delayed";
  if (status === "InProgress") return "in-progress";
  return "pending";
}

function AmendmentCard({
  amendment,
  users,
  onDelete,
  isLocked,
  prjId,
}: {
  amendment: Amendment;
  users: { id: string; name: string; email: string }[];
  onDelete: (id: string) => void;
  isLocked: boolean;
  prjId: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amendment: amendment.amendment ?? "",
    amendmentAmount: amendment.amendmentAmount !== null ? String(amendment.amendmentAmount) : "",
    note: amendment.note ?? "",
    leadApproverId: amendment.leadApproverId ?? "",
    approvalStatusId: amendment.approvalStatusId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/projects/${prjId}/capex/amendments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: amendment.id,
        ...form,
        amendmentAmount: form.amendmentAmount !== "" ? Number(form.amendmentAmount) : null,
        leadApproverId: form.leadApproverId || null,
        approvalStatusId: form.approvalStatusId || null,
        status: form.approvalStatusId || amendment.status,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 text-left">
          <Badge variant={statusVariant(amendment.status)}>{amendment.status}</Badge>
          <span className="font-medium text-gray-800 text-sm">
            {amendment.amendment || "Amendment"}
          </span>
          {amendment.amendmentAmount !== null && (
            <span className="text-xs text-gray-500">
              ${amendment.amendmentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {new Date(amendment.createdOn).toLocaleDateString("en-US")}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 bg-gray-50/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Amendment Section</Label>
              <Select
                value={form.amendment}
                onValueChange={(v) => set("amendment", v === "_none" ? "" : v)}
                disabled={isLocked}
              >
                <SelectTrigger><SelectValue placeholder="Select section..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {AMENDMENT_SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Amendment Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amendmentAmount}
                onChange={(e) => set("amendmentAmount", e.target.value)}
                disabled={isLocked}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Lead Approver</Label>
              <Select
                value={form.leadApproverId}
                onValueChange={(v) => set("leadApproverId", v === "_none" ? "" : v)}
                disabled={isLocked}
              >
                <SelectTrigger><SelectValue placeholder="Select approver..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Approval Status</Label>
              <Select
                value={form.approvalStatusId}
                onValueChange={(v) => set("approvalStatusId", v === "_none" ? "" : v)}
                disabled={isLocked}
              >
                <SelectTrigger><SelectValue placeholder="Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Note</Label>
            <Textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              disabled={isLocked}
              rows={2}
              placeholder="Amendment notes..."
            />
          </div>
          {!isLocked && (
            <div className="flex items-center gap-3 justify-end pt-1">
              {saved && <span className="text-sm text-green-600">Saved</span>}
              <Button
                size="sm"
                onClick={save}
                disabled={saving}
                className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
              >
                <Send className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Submit"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(amendment.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AmendmentsForm({
  prjId,
  project,
  grandTotal,
  capexState,
  initialAmendments,
  users,
}: Props) {
  const isLocked = capexState === "Approved";
  const [amendments, setAmendments] = useState<Amendment[]>(initialAmendments);
  const [adding, setAdding] = useState(false);

  const totalAmendments = amendments.reduce(
    (sum, a) => sum + (a.amendmentAmount ?? 0),
    0
  );
  const revisedTotal = grandTotal + totalAmendments;

  async function addAmendment() {
    setAdding(true);
    const res = await fetch(`/api/projects/${prjId}/capex/amendments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amendment: "", status: "Pending" }),
    });
    if (res.ok) {
      const a = await res.json();
      setAmendments((prev) => [
        {
          id: a.id,
          amendment: a.amendment ?? null,
          amendmentAmount: a.amendmentAmount ? Number(a.amendmentAmount) : null,
          note: a.note ?? null,
          leadApproverId: a.leadApproverId ?? null,
          leadApproverName: a.leadApprover?.name ?? null,
          approvalStatusId: a.approvalStatusId ?? null,
          status: a.status,
          createdOn: a.createdOn,
        },
        ...prev,
      ]);
    }
    setAdding(false);
  }

  async function deleteAmendment(id: string) {
    await fetch(`/api/projects/${prjId}/capex/amendments?id=${id}`, { method: "DELETE" });
    setAmendments((prev) => prev.filter((a) => a.id !== id));
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

      {/* Grand Total summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Original Grand Total</p>
            <p className="text-xl font-bold text-gray-800 mt-1">
              ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center border-x border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Amendments</p>
            <p className={`text-xl font-bold mt-1 ${totalAmendments >= 0 ? "text-green-700" : "text-red-700"}`}>
              {totalAmendments >= 0 ? "+" : ""}${totalAmendments.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Revised Total</p>
            <p className="text-xl font-bold text-[#0f1e35] mt-1">
              ${revisedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Amendments list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Amendments ({amendments.length})
          </h3>
          {!isLocked && (
            <Button
              size="sm"
              onClick={addAmendment}
              disabled={adding}
              className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
            >
              <Plus className="h-3.5 w-3.5" />
              {adding ? "Adding..." : "Add Amendment"}
            </Button>
          )}
        </div>

        {amendments.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
            <p className="text-sm text-gray-400">No amendments yet.</p>
            {!isLocked && (
              <p className="text-xs text-gray-400 mt-1">Click "Add Amendment" to create one.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {amendments.map((a) => (
              <AmendmentCard
                key={a.id}
                amendment={a}
                users={users}
                onDelete={deleteAmendment}
                isLocked={isLocked}
                prjId={prjId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
