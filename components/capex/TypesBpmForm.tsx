"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  prjId: string;
  project: { prjNumber: string; name: string; managerName: string | null; goLiveDate: string | null };
  initialData: {
    isIt: boolean;
    isFacilities: boolean;
    isPhysicalSecurity: boolean;
    itPmId: string | null;
    facilitiesPmId: string | null;
    physicalSecurityPmId: string | null;
    isRoiRequired: boolean;
    roiComment: string | null;
    status: string;
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

export function TypesBpmForm({ prjId, project, initialData, capexState, users }: Props) {
  const router = useRouter();
  const isLocked = capexState === "Submitted" || capexState === "Approved";

  const [form, setForm] = useState({
    isIt: initialData?.isIt ?? false,
    isFacilities: initialData?.isFacilities ?? false,
    isPhysicalSecurity: initialData?.isPhysicalSecurity ?? false,
    itPmId: initialData?.itPmId ?? "",
    facilitiesPmId: initialData?.facilitiesPmId ?? "",
    physicalSecurityPmId: initialData?.physicalSecurityPmId ?? "",
    isRoiRequired: initialData?.isRoiRequired ?? false,
    roiComment: initialData?.roiComment ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(submit = false) {
    if (submit) setSubmitting(true);
    else setSaving(true);

    const payload = {
      ...form,
      itPmId: form.itPmId || null,
      facilitiesPmId: form.facilitiesPmId || null,
      physicalSecurityPmId: form.physicalSecurityPmId || null,
      roiComment: form.roiComment || null,
      ...(submit && { status: "Submitted" }),
    };

    try {
      const res = await fetch(`/api/projects/${prjId}/capex/business-pm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        if (submit) router.push(`/projects/${prjId}/capex/functional/it`);
      }
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  const pmSections = [
    {
      key: "isIt" as const,
      label: "IT",
      pmKey: "itPmId" as const,
      description: "Assign an IT Project Manager for this capex",
    },
    {
      key: "isFacilities" as const,
      label: "Facilities",
      pmKey: "facilitiesPmId" as const,
      description: "Assign a Facilities Project Manager for this capex",
    },
    {
      key: "isPhysicalSecurity" as const,
      label: "Physical Security",
      pmKey: "physicalSecurityPmId" as const,
      description: "Assign a Security Project Manager for this capex",
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

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          This form has been submitted and is now read-only.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
        {/* CapEx Types */}
        <section>
          <SectionTitle>CapEx Functional Areas</SectionTitle>
          <p className="text-sm text-gray-500 mb-4">
            Select all functional areas that apply to this capital expenditure request.
          </p>
          <div className="space-y-6">
            {pmSections.map(({ key, label, pmKey, description }) => (
              <div
                key={key}
                className={`rounded-lg border p-4 transition-colors ${
                  form[key] ? "border-blue-200 bg-blue-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox
                    id={key}
                    checked={form[key]}
                    onCheckedChange={(v) => set(key, Boolean(v))}
                    disabled={isLocked}
                    className="mt-0.5"
                  />
                  <div>
                    <label
                      htmlFor={key}
                      className="text-sm font-semibold text-gray-800 cursor-pointer"
                    >
                      {label}
                    </label>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>

                {form[key] && (
                  <div className="ml-7 mt-3">
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      {label} Project Manager
                    </Label>
                    <Select
                      value={form[pmKey]}
                      onValueChange={(v) => set(pmKey, v === "_none" ? "" : v)}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="w-72">
                        <SelectValue placeholder="Assign PM..." />
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
                    {form[pmKey] && (
                      <p className="text-xs text-gray-400 mt-1">
                        {users.find((u) => u.id === form[pmKey])?.email ?? ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ROI */}
        <section>
          <SectionTitle>Return on Investment (ROI)</SectionTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">ROI Required?</Label>
              <div className="flex gap-4">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isRoiRequired"
                      checked={form.isRoiRequired === v}
                      onChange={() => set("isRoiRequired", v)}
                      disabled={isLocked}
                      className="h-4 w-4 text-[#0f1e35]"
                    />
                    <span className="text-sm">{v ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>
            </div>
            {form.isRoiRequired && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">ROI Comment</Label>
                <Textarea
                  value={form.roiComment}
                  onChange={(e) => set("roiComment", e.target.value)}
                  placeholder="Enter ROI justification..."
                  rows={3}
                  disabled={isLocked}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      {!isLocked && (
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
          <Button
            onClick={() => save(true)}
            disabled={saving || submitting}
            className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      )}
    </div>
  );
}
