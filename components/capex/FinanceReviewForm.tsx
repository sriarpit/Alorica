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
import { Save, Plus, Trash2, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EcMember {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  status: string;
  comments: string | null;
  lastModifyDate: string | null;
}

interface RelatedCapexItem {
  id: string;
  capExNo: string | null;
  description: string | null;
  createdDate: string;
}

interface Props {
  prjId: string;
  project: { prjNumber: string; name: string; managerName: string | null; goLiveDate: string | null };
  grandTotal: number;
  totals: { it: number; facilities: number; security: number };
  capexState: string;
  financeData: {
    id: string;
    isBudget: boolean | null;
    explanation: string | null;
    regCorpFinanceApproverId: string | null;
    regionalApprovalStatusId: string | null;
    vpFinanceApproverId: string | null;
    vpFinanceApprovalStatusId: string | null;
    projectCapex: string | null;
    statusRC: string | null;
    statusVP: string | null;
  } | null;
  ecMembers: EcMember[];
  relatedCapex: RelatedCapexItem[];
  users: { id: string; name: string; email: string }[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
      {children}
    </h3>
  );
}

const APPROVAL_STATUSES = ["Pending", "Approved", "Rejected", "InProgress"];

function fmt(v: number): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function statusVariant(status: string): "completed" | "pending" | "delayed" | "in-progress" {
  if (status === "Approved") return "completed";
  if (status === "Rejected") return "delayed";
  if (status === "InProgress") return "in-progress";
  return "pending";
}

export function FinanceReviewForm({
  prjId,
  project,
  grandTotal,
  totals,
  capexState,
  financeData,
  ecMembers: initialEcMembers,
  relatedCapex: initialRelatedCapex,
  users,
}: Props) {
  const requiresEC = grandTotal > 25000;
  const isGlobalLocked = capexState === "Approved";

  const [finance, setFinance] = useState({
    isBudget: financeData?.isBudget ?? null as boolean | null,
    explanation: financeData?.explanation ?? "",
    regCorpFinanceApproverId: financeData?.regCorpFinanceApproverId ?? "",
    regionalApprovalStatusId: financeData?.regionalApprovalStatusId ?? "",
    vpFinanceApproverId: financeData?.vpFinanceApproverId ?? "",
    vpFinanceApprovalStatusId: financeData?.vpFinanceApprovalStatusId ?? "",
    projectCapex: financeData?.projectCapex ?? "",
  });

  const [ecMembers, setEcMembers] = useState<EcMember[]>(initialEcMembers);
  const [relatedCapex, setRelatedCapex] = useState<RelatedCapexItem[]>(initialRelatedCapex);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newRelated, setNewRelated] = useState({ capExNo: "", description: "" });
  const [generatingId, setGeneratingId] = useState(false);

  function setF(key: string, value: string | boolean | null) {
    setFinance((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function saveFinance() {
    setSaving(true);
    const payload = {
      isBudget: finance.isBudget,
      explanation: finance.explanation || null,
      regCorpFinanceApproverId: finance.regCorpFinanceApproverId || null,
      regionalApprovalStatusId: finance.regionalApprovalStatusId || null,
      vpFinanceApproverId: finance.vpFinanceApproverId || null,
      vpFinanceApprovalStatusId: finance.vpFinanceApprovalStatusId || null,
      projectCapex: finance.projectCapex || null,
    };
    try {
      const res = await fetch(`/api/projects/${prjId}/capex/finance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function generateCapexId() {
    setGeneratingId(true);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const generated = `Proj-CapExId_${rand}`;
    setF("projectCapex", generated);
    await fetch(`/api/projects/${prjId}/capex/finance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectCapex: generated }),
    });
    setGeneratingId(false);
  }

  async function addEcMember(userId: string) {
    const res = await fetch(`/api/projects/${prjId}/capex/ec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const member = await res.json();
      setEcMembers((m) => [member, ...m]);
    }
  }

  async function removeEcMember(id: string) {
    await fetch(`/api/projects/${prjId}/capex/ec?id=${id}`, { method: "DELETE" });
    setEcMembers((m) => m.filter((e) => e.id !== id));
  }

  async function addRelated() {
    if (!newRelated.capExNo) return;
    const res = await fetch(`/api/projects/${prjId}/capex/related`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRelated),
    });
    if (res.ok) {
      const item = await res.json();
      setRelatedCapex((r) => [item, ...r]);
      setNewRelated({ capExNo: "", description: "" });
    }
  }

  async function removeRelated(id: string) {
    await fetch(`/api/projects/${prjId}/capex/related?id=${id}`, { method: "DELETE" });
    setRelatedCapex((r) => r.filter((i) => i.id !== id));
  }

  const [ecSelectUser, setEcSelectUser] = useState("");

  return (
    <div className="space-y-6">
      <CapexFormHeader
        prjNumber={project.prjNumber}
        projectName={project.name}
        managerName={project.managerName}
        goLiveDate={project.goLiveDate}
        capexState={capexState}
      />

      {/* Grand Total Summary (read-only) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Request Summary — Grand Total</SectionTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Category</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2.5 text-gray-700">IT</td><td className="px-4 py-2.5 text-right">{fmt(totals.it)}</td></tr>
            <tr><td className="px-4 py-2.5 text-gray-700">Facilities (Net of TIA)</td><td className="px-4 py-2.5 text-right">{fmt(totals.facilities)}</td></tr>
            <tr><td className="px-4 py-2.5 text-gray-700">Physical Security</td><td className="px-4 py-2.5 text-right">{fmt(totals.security)}</td></tr>
            <tr className="bg-[#0f1e35] text-white font-semibold">
              <td className="px-4 py-3">Grand Total</td>
              <td className="px-4 py-3 text-right">{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
        {requiresEC && (
          <div className="mt-3 text-xs text-amber-600 font-medium">
            ⚠ Executive Committee approval required (Grand Total &gt; $25,000)
          </div>
        )}
      </div>

      {/* Finance Review */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
        <section>
          <SectionTitle>Finance Review</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">IS Budgeted?</Label>
              <div className="flex gap-4">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isBudget"
                      checked={finance.isBudget === v}
                      onChange={() => setF("isBudget", v)}
                      disabled={isGlobalLocked}
                      className="h-4 w-4 text-[#0f1e35]"
                    />
                    <span className="text-sm">{v ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Explanation</Label>
              <Textarea
                value={finance.explanation}
                onChange={(e) => setF("explanation", e.target.value)}
                disabled={isGlobalLocked}
                rows={2}
                placeholder="Budget explanation..."
              />
            </div>
          </div>
        </section>

        {/* RC Finance Approver */}
        <section>
          <SectionTitle>Regional / Corporate Finance Approver</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Finance Approver</Label>
              <Select
                value={finance.regCorpFinanceApproverId}
                onValueChange={(v) => setF("regCorpFinanceApproverId", v === "_none" ? "" : v)}
                disabled={isGlobalLocked}
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
                value={finance.regionalApprovalStatusId}
                onValueChange={(v) => setF("regionalApprovalStatusId", v === "_none" ? "" : v)}
                disabled={isGlobalLocked}
              >
                <SelectTrigger><SelectValue placeholder="Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {finance.regionalApprovalStatusId && (
            <div className="mt-3">
              <Badge variant={statusVariant(finance.regionalApprovalStatusId)}>
                RC: {finance.regionalApprovalStatusId}
              </Badge>
            </div>
          )}
        </section>

        {/* VP Finance Approver */}
        <section>
          <SectionTitle>VP Finance Approver</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">VP Finance Approver</Label>
              <Select
                value={finance.vpFinanceApproverId}
                onValueChange={(v) => setF("vpFinanceApproverId", v === "_none" ? "" : v)}
                disabled={isGlobalLocked}
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
                value={finance.vpFinanceApprovalStatusId}
                onValueChange={(v) => setF("vpFinanceApprovalStatusId", v === "_none" ? "" : v)}
                disabled={isGlobalLocked}
              >
                <SelectTrigger><SelectValue placeholder="Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {finance.vpFinanceApprovalStatusId && (
            <div className="mt-3">
              <Badge variant={statusVariant(finance.vpFinanceApprovalStatusId)}>
                VP: {finance.vpFinanceApprovalStatusId}
              </Badge>
            </div>
          )}
        </section>

        {/* Executive Committee */}
        {requiresEC && (
          <section>
            <SectionTitle>Executive Committee</SectionTitle>
            {!isGlobalLocked && (
              <div className="flex items-end gap-3 mb-4">
                <div className="flex-1 max-w-xs space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Add EC Member</Label>
                  <Select
                    value={ecSelectUser}
                    onValueChange={setEcSelectUser}
                  >
                    <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (ecSelectUser) { addEcMember(ecSelectUser); setEcSelectUser(""); }
                  }}
                  className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            )}
            {ecMembers.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Name</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Email</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Comments</th>
                    {!isGlobalLocked && <th className="px-4 py-2.5 w-12" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ecMembers.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-medium">{m.userName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.userEmail ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{m.comments ?? "—"}</td>
                      {!isGlobalLocked && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeEcMember(m.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                No EC members added yet
              </p>
            )}
          </section>
        )}

        {/* CapEx ID */}
        <section>
          <SectionTitle>Project CapEx Number</SectionTitle>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">CapEx ID</Label>
              <Input
                value={finance.projectCapex}
                readOnly
                className="bg-gray-50 font-mono"
                placeholder="Not yet generated"
              />
            </div>
            {!isGlobalLocked && !finance.projectCapex && (
              <Button
                size="sm"
                onClick={generateCapexId}
                disabled={generatingId}
                className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
              >
                <Hash className="h-3.5 w-3.5" />
                {generatingId ? "Generating..." : "Generate CapEx ID"}
              </Button>
            )}
          </div>
        </section>

        {/* Related CapEx */}
        <section>
          <SectionTitle>Related CapEx Numbers</SectionTitle>
          {!isGlobalLocked && (
            <div className="flex items-end gap-3 mb-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">CapEx No.</Label>
                <Input
                  value={newRelated.capExNo}
                  onChange={(e) => setNewRelated((r) => ({ ...r, capExNo: e.target.value }))}
                  placeholder="Proj-CapExId_XXXX"
                  className="w-44"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-gray-600">Description</Label>
                <Input
                  value={newRelated.description}
                  onChange={(e) => setNewRelated((r) => ({ ...r, description: e.target.value }))}
                  placeholder="Description..."
                />
              </div>
              <Button size="sm" onClick={addRelated} className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          )}
          {relatedCapex.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">CapEx No.</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Description</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Date Added</th>
                  {!isGlobalLocked && <th className="px-4 py-2.5 w-12" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {relatedCapex.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs">{r.capExNo ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.description ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(r.createdDate).toLocaleDateString("en-US")}
                    </td>
                    {!isGlobalLocked && (
                      <td className="px-4 py-3">
                        <button onClick={() => removeRelated(r.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
              No related CapEx numbers
            </p>
          )}
        </section>
      </div>

      {!isGlobalLocked && (
        <div className="flex items-center gap-3 justify-end">
          {saved && <span className="text-sm text-green-600">Saved successfully</span>}
          <Button
            onClick={saveFinance}
            disabled={saving}
            className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Finance Review"}
          </Button>
        </div>
      )}
    </div>
  );
}
