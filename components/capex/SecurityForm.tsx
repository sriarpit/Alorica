"use client";

import { useState } from "react";
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
import { Save, Send } from "lucide-react";

interface Props {
  prjId: string;
  project: { prjNumber: string; name: string; managerName: string | null; goLiveDate: string | null };
  initialData: {
    securityTotal: number | null;
    securitySeats: number | null;
    isExistingInventoryEvaluatedSec: boolean | null;
    isCompetitiveBidSec: boolean | null;
    securityLeadApproverId: string | null;
    securityLeadApproveStatus: string | null;
    securitySessionStatus: string | null;
  } | null;
  capexState: string;
  users: { id: string; name: string; email: string }[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
      {children}
    </h3>
  );
}

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "InProgress"];

export function SecurityForm({ prjId, project, initialData, capexState, users }: Props) {
  const router = useRouter();
  const isLocked = initialData?.securitySessionStatus === "Submitted";
  const isGlobalLocked = capexState === "Approved";
  const readonly = isLocked || isGlobalLocked;

  const [form, setForm] = useState({
    securityTotal: initialData?.securityTotal !== null ? String(initialData?.securityTotal) : "",
    securitySeats: initialData?.securitySeats !== null ? String(initialData?.securitySeats) : "",
    isExistingInventoryEvaluatedSec: initialData?.isExistingInventoryEvaluatedSec ?? false,
    isCompetitiveBidSec: initialData?.isCompetitiveBidSec ?? false,
    securityLeadApproverId: initialData?.securityLeadApproverId ?? "",
    securityLeadApproveStatus: initialData?.securityLeadApproveStatus ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  const costPerSeat =
    form.securityTotal && form.securitySeats
      ? `$${(Number(form.securityTotal) / Number(form.securitySeats)).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "—";

  async function save(submit = false) {
    if (submit) setSubmitting(true);
    else setSaving(true);

    const payload: Record<string, unknown> = {
      section: "security",
      securityTotal: form.securityTotal !== "" ? Number(form.securityTotal) : null,
      securitySeats: form.securitySeats !== "" ? Number(form.securitySeats) : null,
      isExistingInventoryEvaluatedSec: form.isExistingInventoryEvaluatedSec,
      isCompetitiveBidSec: form.isCompetitiveBidSec,
      securityLeadApproverId: form.securityLeadApproverId || null,
      securityLeadApproveStatus: form.securityLeadApproveStatus || null,
      ...(submit && { securitySessionStatus: "Submitted" }),
    };

    try {
      const res = await fetch(`/api/projects/${prjId}/capex/section-details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        if (submit) router.push(`/projects/${prjId}/capex/total`);
      }
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
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

      {readonly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          This section has been submitted and is now read-only.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
        {/* Security Cost Summary */}
        <section>
          <SectionTitle>Physical Security Summary</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-48">Category</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Total ($)</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Seats / Hours</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Cost per Seat</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">Physical Security</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.securityTotal}
                      onChange={(e) => set("securityTotal", e.target.value)}
                      disabled={readonly}
                      className="text-right w-32 ml-auto"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      value={form.securitySeats}
                      onChange={(e) => set("securitySeats", e.target.value)}
                      disabled={readonly}
                      className="text-right w-24 ml-auto"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{costPerSeat}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Lead Approver */}
        <section>
          <SectionTitle>Security Lead Approver</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Lead Approver</Label>
              <Select
                value={form.securityLeadApproverId}
                onValueChange={(v) => set("securityLeadApproverId", v === "_none" ? "" : v)}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Approval Status</Label>
              <Select
                value={form.securityLeadApproveStatus}
                onValueChange={(v) => set("securityLeadApproveStatus", v === "_none" ? "" : v)}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section>
          <SectionTitle>Compliance</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: "isExistingInventoryEvaluatedSec" as const, label: "Existing Inventory Evaluated?" },
              { key: "isCompetitiveBidSec" as const, label: "Competitive Bid?" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">{label}</Label>
                <div className="flex gap-4">
                  {[true, false].map((v) => (
                    <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={key}
                        checked={form[key] === v}
                        onChange={() => set(key, v)}
                        disabled={readonly}
                        className="h-4 w-4 text-[#0f1e35]"
                      />
                      <span className="text-sm">{v ? "Yes" : "No"}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {!isGlobalLocked && (
        <div className="flex items-center gap-3 justify-end">
          {saved && <span className="text-sm text-green-600">Saved successfully</span>}
          <Button
            variant="outline"
            onClick={() => save(false)}
            disabled={saving || submitting}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          {!isLocked && (
            <Button
              onClick={() => save(true)}
              disabled={saving || submitting}
              className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit to Security Leadership"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
