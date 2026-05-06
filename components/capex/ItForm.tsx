"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Save, Send } from "lucide-react";

interface Props {
  prjId: string;
  project: { prjNumber: string; name: string; managerName: string | null; goLiveDate: string | null };
  initialData: {
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
    eusLeadApproverId: string | null;
    eusStatus: string | null;
    capitalLaborLeadApproverId: string | null;
    capitalLaborLeadStatus: string | null;
    itComments: string | null;
    itSessionStatus: string | null;
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

function costPerSeat(total: number | string, seats: number | string): string {
  const t = Number(total);
  const s = Number(seats);
  if (!t || !s) return "—";
  return `$${(t / s).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmt(v: number | string | null | undefined): string {
  if (v === null || v === "" || v === undefined) return "";
  return String(v);
}

export function ItForm({ prjId, project, initialData, capexState, users }: Props) {
  const router = useRouter();
  const isLocked = initialData?.itSessionStatus === "Submitted";
  const isGlobalLocked = capexState === "Approved";

  const [form, setForm] = useState({
    infrastructureCostTotal: fmt(initialData?.infrastructureCostTotal),
    infrastructureCostSeats: fmt(initialData?.infrastructureCostSeats),
    eusCostTotal: fmt(initialData?.eusCostTotal),
    eusCostSeats: fmt(initialData?.eusCostSeats),
    capitalLaborCostTotal: fmt(initialData?.capitalLaborCostTotal),
    capitalLaborCostSeats: fmt(initialData?.capitalLaborCostSeats),
    isExistingInventoryEvaluatedIT: initialData?.isExistingInventoryEvaluatedIT ?? false,
    isCompetitiveBidIT: initialData?.isCompetitiveBidIT ?? false,
    infrastructureLeadApproverId: initialData?.infrastructureLeadApproverId ?? "",
    infrastructureLeadStatus: initialData?.infrastructureLeadStatus ?? "",
    eusLeadApproverId: initialData?.eusLeadApproverId ?? "",
    eusStatus: initialData?.eusStatus ?? "",
    capitalLaborLeadApproverId: initialData?.capitalLaborLeadApproverId ?? "",
    capitalLaborLeadStatus: initialData?.capitalLaborLeadStatus ?? "",
    itComments: initialData?.itComments ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const readonly = isLocked || isGlobalLocked;

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(submit = false) {
    if (submit) setSubmitting(true);
    else setSaving(true);

    const numericFields = [
      "infrastructureCostTotal", "infrastructureCostSeats",
      "eusCostTotal", "eusCostSeats",
      "capitalLaborCostTotal", "capitalLaborCostSeats",
    ];

    const payload: Record<string, unknown> = {
      section: "it",
      ...form,
      ...(submit && { itSessionStatus: "Submitted" }),
    };

    for (const f of numericFields) {
      payload[f] = payload[f] !== "" ? Number(payload[f]) : null;
    }

    for (const k of ["infrastructureLeadApproverId", "eusLeadApproverId", "capitalLaborLeadApproverId",
      "infrastructureLeadStatus", "eusStatus", "capitalLaborLeadStatus"]) {
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
        if (submit) router.push(`/projects/${prjId}/capex/functional/facilities`);
      }
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  const itRows = [
    { label: "Infrastructure Cost", totalKey: "infrastructureCostTotal", seatsKey: "infrastructureCostSeats", approverKey: "infrastructureLeadApproverId", statusKey: "infrastructureLeadStatus" },
    { label: "EUS Cost", totalKey: "eusCostTotal", seatsKey: "eusCostSeats", approverKey: "eusLeadApproverId", statusKey: "eusStatus" },
    { label: "Capital Labor Cost", totalKey: "capitalLaborCostTotal", seatsKey: "capitalLaborCostSeats", approverKey: "capitalLaborLeadApproverId", statusKey: "capitalLaborLeadStatus" },
  ] as const;

  const grandTotal = [
    form.infrastructureCostTotal,
    form.eusCostTotal,
    form.capitalLaborCostTotal,
  ].reduce((sum, v) => sum + (Number(v) || 0), 0);

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
          This section has been submitted. Only comments remain editable.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
        {/* IT Cost Summary */}
        <section>
          <SectionTitle>IT Summary</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-48">Cost Category</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Total ($)</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Seats / Hours</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Cost per Seat</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-52">Lead Approver</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itRows.map((row) => (
                  <tr key={row.label} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={form[row.totalKey]}
                        onChange={(e) => set(row.totalKey, e.target.value)}
                        disabled={readonly}
                        className="text-right w-32 ml-auto"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={form[row.seatsKey]}
                        onChange={(e) => set(row.seatsKey, e.target.value)}
                        disabled={readonly}
                        className="text-right w-24 ml-auto"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {costPerSeat(form[row.totalKey], form[row.seatsKey])}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={form[row.approverKey]}
                        onValueChange={(v) => set(row.approverKey, v === "_none" ? "" : v)}
                        disabled={readonly}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={form[row.statusKey]}
                        onValueChange={(v) => set(row.statusKey, v === "_none" ? "" : v)}
                        disabled={readonly}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Status..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-800">Total</td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Compliance questions */}
        <section>
          <SectionTitle>Compliance</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: "isExistingInventoryEvaluatedIT" as const, label: "Existing Inventory Evaluated?" },
              { key: "isCompetitiveBidIT" as const, label: "Competitive Bid?" },
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

        {/* Comments — always editable even when locked */}
        <section>
          <SectionTitle>Comments</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">IT Comments</Label>
            <Textarea
              value={form.itComments}
              onChange={(e) => set("itComments", e.target.value)}
              placeholder="Enter any relevant comments..."
              rows={4}
              disabled={isGlobalLocked}
            />
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
              {submitting ? "Submitting..." : "Submit to IT Leadership"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
