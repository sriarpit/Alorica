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
    construction: number | null;
    constructionSeats: number | null;
    electricalCabling: number | null;
    electricalCablingSeats: number | null;
    furnitureFixture: number | null;
    furnitureFixtureSeats: number | null;
    others: number | null;
    othersSeats: number | null;
    tenantImprovementAllowance: number | null;
    isExistingInventoryEvaluatedFac: boolean | null;
    isCompetitiveBidFac: boolean | null;
    facilitiesLeadApproverId: string | null;
    facilitiesStatus: string | null;
    leaseRegion: string | null;
    leaseLocation: string | null;
    leaseDetails: string | null;
    leaseTerms: string | null;
    totalLeaseValue: number | null;
    currentYearOpexImpact: number | null;
    facilitiesSessionStatus: string | null;
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

function fmt(v: number | null): string {
  return v !== null ? String(v) : "";
}

function costPerSeat(total: string, seats: string): string {
  const t = Number(total);
  const s = Number(seats);
  if (!t || !s) return "—";
  return `$${(t / s).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FacilitiesForm({ prjId, project, initialData, capexState, users }: Props) {
  const router = useRouter();
  const isLocked = initialData?.facilitiesSessionStatus === "Submitted";
  const isGlobalLocked = capexState === "Approved";
  const readonly = isLocked || isGlobalLocked;

  const [form, setForm] = useState({
    construction: fmt(initialData?.construction ?? null),
    constructionSeats: fmt(initialData?.constructionSeats ?? null),
    electricalCabling: fmt(initialData?.electricalCabling ?? null),
    electricalCablingSeats: fmt(initialData?.electricalCablingSeats ?? null),
    furnitureFixture: fmt(initialData?.furnitureFixture ?? null),
    furnitureFixtureSeats: fmt(initialData?.furnitureFixtureSeats ?? null),
    others: fmt(initialData?.others ?? null),
    othersSeats: fmt(initialData?.othersSeats ?? null),
    tenantImprovementAllowance: fmt(initialData?.tenantImprovementAllowance ?? null),
    isExistingInventoryEvaluatedFac: initialData?.isExistingInventoryEvaluatedFac ?? false,
    isCompetitiveBidFac: initialData?.isCompetitiveBidFac ?? false,
    facilitiesLeadApproverId: initialData?.facilitiesLeadApproverId ?? "",
    facilitiesStatus: initialData?.facilitiesStatus ?? "",
    leaseRegion: initialData?.leaseRegion ?? "",
    leaseLocation: initialData?.leaseLocation ?? "",
    leaseDetails: initialData?.leaseDetails ?? "",
    leaseTerms: initialData?.leaseTerms ?? "",
    totalLeaseValue: fmt(initialData?.totalLeaseValue ?? null),
    currentYearOpexImpact: fmt(initialData?.currentYearOpexImpact ?? null),
  });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  const costRows = [
    { label: "Construction", totalKey: "construction", seatsKey: "constructionSeats" },
    { label: "Electrical / Cabling", totalKey: "electricalCabling", seatsKey: "electricalCablingSeats" },
    { label: "Furniture & Fixture", totalKey: "furnitureFixture", seatsKey: "furnitureFixtureSeats" },
    { label: "Others", totalKey: "others", seatsKey: "othersSeats" },
  ] as const;

  const grossTotal = costRows.reduce((sum, r) => sum + (Number(form[r.totalKey]) || 0), 0);
  const tia = Number(form.tenantImprovementAllowance) || 0;
  const netTotal = grossTotal + tia; // TIA entered as negative

  async function save(submit = false) {
    if (submit) setSubmitting(true);
    else setSaving(true);

    const numericFields = [
      "construction", "constructionSeats", "electricalCabling", "electricalCablingSeats",
      "furnitureFixture", "furnitureFixtureSeats", "others", "othersSeats",
      "tenantImprovementAllowance", "totalLeaseValue", "currentYearOpexImpact",
    ];

    const payload: Record<string, unknown> = {
      section: "facilities",
      ...form,
      ...(submit && { facilitiesSessionStatus: "Submitted" }),
    };

    for (const f of numericFields) {
      payload[f] = payload[f] !== "" ? Number(payload[f]) : null;
    }

    for (const k of ["facilitiesLeadApproverId", "facilitiesStatus"]) {
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
        if (submit) router.push(`/projects/${prjId}/capex/functional/security`);
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
        {/* Facilities Cost Summary */}
        <section>
          <SectionTitle>Facilities Summary</SectionTitle>
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
              <tbody className="divide-y divide-gray-100">
                {costRows.map((row) => (
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
                  </tr>
                ))}
                {/* Summary rows */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-2.5 font-semibold text-gray-700">Total Gross Facilities Spend</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                    ${grossTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} />
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-700">
                    Tenant Improvement Allowance (TIA)
                    <span className="text-xs text-gray-400 ml-1">(enter as negative)</span>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.tenantImprovementAllowance}
                      onChange={(e) => set("tenantImprovementAllowance", e.target.value)}
                      disabled={readonly}
                      className="text-right w-32 ml-auto"
                      placeholder="-0.00"
                    />
                  </td>
                  <td colSpan={2} />
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-4 py-2.5 font-semibold text-blue-800">Facilities Spend Net of TIA</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-800">
                    ${netTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Lead Approver */}
        <section>
          <SectionTitle>Facilities Lead Approver</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Lead Approver</Label>
              <Select
                value={form.facilitiesLeadApproverId}
                onValueChange={(v) => set("facilitiesLeadApproverId", v === "_none" ? "" : v)}
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
                value={form.facilitiesStatus}
                onValueChange={(v) => set("facilitiesStatus", v === "_none" ? "" : v)}
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
              { key: "isExistingInventoryEvaluatedFac" as const, label: "Existing Inventory Evaluated?" },
              { key: "isCompetitiveBidFac" as const, label: "Competitive Bid?" },
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

        {/* Lease Information */}
        <section>
          <SectionTitle>Lease Information</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Lease Region</Label>
              <Input
                value={form.leaseRegion}
                onChange={(e) => set("leaseRegion", e.target.value)}
                disabled={readonly}
                placeholder="e.g. Americas"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Lease Location</Label>
              <Input
                value={form.leaseLocation}
                onChange={(e) => set("leaseLocation", e.target.value)}
                disabled={readonly}
                placeholder="e.g. New York"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Lease Terms</Label>
              <Input
                value={form.leaseTerms}
                onChange={(e) => set("leaseTerms", e.target.value)}
                disabled={readonly}
                placeholder="e.g. 5 years"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Total Lease Value ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.totalLeaseValue}
                onChange={(e) => set("totalLeaseValue", e.target.value)}
                disabled={readonly}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Current Year OpEx Impact ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.currentYearOpexImpact}
                onChange={(e) => set("currentYearOpexImpact", e.target.value)}
                disabled={readonly}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-medium text-gray-700">Lease Details</Label>
              <Textarea
                value={form.leaseDetails}
                onChange={(e) => set("leaseDetails", e.target.value)}
                disabled={readonly}
                rows={2}
                placeholder="Lease details..."
              />
            </div>
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
              {submitting ? "Submitting..." : "Submit to Facilities Leadership"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
