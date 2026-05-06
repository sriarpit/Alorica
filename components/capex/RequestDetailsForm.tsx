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

interface ProjectInfo {
  prjNumber: string;
  name: string;
  managerName: string | null;
  goLiveDate: string | null;
}

interface InitialData {
  id: string;
  requestDate: string | null;
  businessRequesterId: string | null;
  businessSponsorId: string | null;
  serviceNowProjectNo: string | null;
  region: string | null;
  country: string | null;
  specification: string | null;
  projectDescription: string | null;
  businessJustification: string | null;
  isClientMandated: boolean;
  clientName: string | null;
  isFunded: boolean;
  isClientContractualObligation: boolean;
  capexClassificationId: number | null;
  capexSubClassificationId: number | null;
  projectTypeId: number | null;
  goLiveOnDate: string | null;
  googlemapsLocationlink: string | null;
  scope: string | null;
  isNewlogoGrowth: boolean;
  state: string;
}

interface Props {
  prjId: string;
  project: ProjectInfo;
  initialData: InitialData | null;
  classifications: { id: number; name: string }[];
  subClassifications: { id: number; name: string }[];
  projectTypes: { id: number; name: string }[];
  users: { id: string; name: string; email: string }[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
      {children}
    </h3>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function RequestDetailsForm({
  prjId,
  project,
  initialData,
  classifications,
  subClassifications,
  projectTypes,
  users,
}: Props) {
  const router = useRouter();
  const isLocked = initialData?.state === "Submitted" || initialData?.state === "Approved";

  const [form, setForm] = useState({
    requestDate: initialData?.requestDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    businessRequesterId: initialData?.businessRequesterId ?? "",
    businessSponsorId: initialData?.businessSponsorId ?? "",
    serviceNowProjectNo: initialData?.serviceNowProjectNo ?? "",
    region: initialData?.region ?? "",
    country: initialData?.country ?? "",
    specification: initialData?.specification ?? "",
    projectDescription: initialData?.projectDescription ?? "",
    businessJustification: initialData?.businessJustification ?? "",
    isClientMandated: initialData?.isClientMandated ?? false,
    clientName: initialData?.clientName ?? "",
    isFunded: initialData?.isFunded ?? false,
    isClientContractualObligation: initialData?.isClientContractualObligation ?? false,
    capexClassificationId: initialData?.capexClassificationId ? String(initialData.capexClassificationId) : "",
    capexSubClassificationId: initialData?.capexSubClassificationId ? String(initialData.capexSubClassificationId) : "",
    projectTypeId: initialData?.projectTypeId ? String(initialData.projectTypeId) : "",
    goLiveOnDate: initialData?.goLiveOnDate?.slice(0, 10) ?? "",
    googlemapsLocationlink: initialData?.googlemapsLocationlink ?? "",
    scope: initialData?.scope ?? "",
    isNewlogoGrowth: initialData?.isNewlogoGrowth ?? false,
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
      capexClassificationId: form.capexClassificationId ? Number(form.capexClassificationId) : null,
      capexSubClassificationId: form.capexSubClassificationId ? Number(form.capexSubClassificationId) : null,
      projectTypeId: form.projectTypeId ? Number(form.projectTypeId) : null,
      requestDate: form.requestDate || null,
      goLiveOnDate: form.goLiveOnDate || null,
      ...(submit && { state: "Submitted" }),
    };

    try {
      const res = await fetch(`/api/projects/${prjId}/capex`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        if (submit) router.push(`/projects/${prjId}/capex/types-bpm`);
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
        capexState={initialData?.state ?? "Draft"}
      />

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          This form has been submitted and is now read-only.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
        {/* Request Info */}
        <section>
          <SectionTitle>Request Information</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Request Date" required>
              <Input
                type="date"
                value={form.requestDate}
                onChange={(e) => set("requestDate", e.target.value)}
                disabled={isLocked}
              />
            </Field>
            <Field label="Business Requester">
              <Select
                value={form.businessRequesterId}
                onValueChange={(v) => set("businessRequesterId", v === "_none" ? "" : v)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select requester..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Business Sponsor">
              <Select
                value={form.businessSponsorId}
                onValueChange={(v) => set("businessSponsorId", v === "_none" ? "" : v)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sponsor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="ServiceNow Project No.">
              <Input
                value={form.serviceNowProjectNo}
                onChange={(e) => set("serviceNowProjectNo", e.target.value)}
                placeholder="SNW-XXXXX"
                disabled={isLocked}
              />
            </Field>
            <Field label="Region">
              <Input
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                placeholder="e.g. Americas"
                disabled={isLocked}
              />
            </Field>
            <Field label="Country">
              <Input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="e.g. United States"
                disabled={isLocked}
              />
            </Field>
          </div>
        </section>

        {/* Classification */}
        <section>
          <SectionTitle>Classification & Type</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="CapEx Classification" required>
              <Select
                value={form.capexClassificationId}
                onValueChange={(v) => set("capexClassificationId", v === "_none" ? "" : v)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select classification..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {classifications.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sub-Classification">
              <Select
                value={form.capexSubClassificationId}
                onValueChange={(v) => set("capexSubClassificationId", v === "_none" ? "" : v)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-classification..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {subClassifications.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Project Type">
              <Select
                value={form.projectTypeId}
                onValueChange={(v) => set("projectTypeId", v === "_none" ? "" : v)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {projectTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Go-Live Target Date">
              <Input
                type="date"
                value={form.goLiveOnDate}
                onChange={(e) => set("goLiveOnDate", e.target.value)}
                disabled={isLocked}
              />
            </Field>
            <Field label="Project Location (Google Maps URL)">
              <Input
                value={form.googlemapsLocationlink}
                onChange={(e) => set("googlemapsLocationlink", e.target.value)}
                placeholder="https://maps.google.com/..."
                disabled={isLocked}
              />
            </Field>
            <Field label="Scope">
              <Input
                value={form.scope}
                onChange={(e) => set("scope", e.target.value)}
                placeholder="Enter scope"
                disabled={isLocked}
              />
            </Field>
          </div>
        </section>

        {/* Description */}
        <section>
          <SectionTitle>Project Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Project Description" required>
              <Textarea
                value={form.projectDescription}
                onChange={(e) => set("projectDescription", e.target.value)}
                placeholder="Describe the project..."
                rows={4}
                disabled={isLocked}
              />
            </Field>
            <Field label="Business Justification" required>
              <Textarea
                value={form.businessJustification}
                onChange={(e) => set("businessJustification", e.target.value)}
                placeholder="Justify the business need..."
                rows={4}
                disabled={isLocked}
              />
            </Field>
          </div>
        </section>

        {/* Flags */}
        <section>
          <SectionTitle>Compliance & Funding</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Client Mandated */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Client Mandated?</Label>
              <div className="flex gap-4">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isClientMandated"
                      checked={form.isClientMandated === v}
                      onChange={() => set("isClientMandated", v)}
                      disabled={isLocked}
                      className="h-4 w-4 text-[#0f1e35]"
                    />
                    <span className="text-sm">{v ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>
              {form.isClientMandated && (
                <Input
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  placeholder="Client name..."
                  disabled={isLocked}
                  className="mt-2"
                />
              )}
            </div>

            {/* Client Funded */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Client Funded?</Label>
              <div className="flex gap-4">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isFunded"
                      checked={form.isFunded === v}
                      onChange={() => set("isFunded", v)}
                      disabled={isLocked}
                      className="h-4 w-4 text-[#0f1e35]"
                    />
                    <span className="text-sm">{v ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contractual Obligation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Client Contractual Obligation?</Label>
              <div className="flex gap-4">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isClientContractualObligation"
                      checked={form.isClientContractualObligation === v}
                      onChange={() => set("isClientContractualObligation", v)}
                      disabled={isLocked}
                      className="h-4 w-4 text-[#0f1e35]"
                    />
                    <span className="text-sm">{v ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* New Logo Growth */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">New Logo Growth?</Label>
              <div className="flex gap-4">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isNewlogoGrowth"
                      checked={form.isNewlogoGrowth === v}
                      onChange={() => set("isNewlogoGrowth", v)}
                      disabled={isLocked}
                      className="h-4 w-4 text-[#0f1e35]"
                    />
                    <span className="text-sm">{v ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Action buttons */}
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
