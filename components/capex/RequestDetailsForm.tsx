"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CapexFormHeader } from "./CapexFormHeader";
import { FileUploadZone } from "./FileUploadZone";
import { Save, Send, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjectInfo {
  prjNumber: string;
  name: string;
  managerName: string | null;
  businessOwnerName: string | null;
  goLiveDate: string | null;
  startDate: string | null;
  endDate: string | null;
  region: string | null;
  country: string | null;
  location: string | null;
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
  clientNameFromDropdown: string | null;
  clientName: string | null;
  isNewlogoNotListed: boolean;
  clientMandatedComments: string | null;
  isFunded: boolean;
  isClientContractualObligation: boolean;
  capexClassificationId: number | null;
  capexSubClassificationId: number | null;
  projectTypeId: number | null;
  goLiveOnDate: string | null;
  googlemapsLocationlink: string | null;
  scope: string | null;
  isNewlogoGrowth: boolean;
  newlogoGrowth: string | null;
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
  clientNames: { id: string; clientName: string }[];
  userRoles: string[];
  currentUserName: string;
  isRCApproved: boolean;
}

// ── Sub-classification mapping ────────────────────────────────────────────────

const CLASSIFICATION_SUB_MAP: Record<string, string[]> = {
  Growth: ["Growthsub", "CapitalLabor", "Infrastructure", "LHI"],
  Maintenance: ["Maintenancesub", "Miscellaneous", "Compliance", "CapitalLabor"],
  Technology: ["TechnologySub", "CriticalEquipment", "Infrastructure", "CapitalLabor"],
  Relocation: ["Relocationsub", "Miscellaneous"],
  NewLogo: ["Growthsub", "CapitalLabor", "LHI"],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
      {children}
    </h3>
  );
}

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-500">{label}</Label>
      <div className="h-9 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700">
        {value ?? "—"}
      </div>
    </div>
  );
}

function RadioGroup({
  name, value, onChange, disabled,
}: {
  name: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex gap-4 pt-1">
      {[true, false].map((v) => (
        <label key={String(v)} className={cn("flex items-center gap-2", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
          <input
            type="radio"
            name={name}
            checked={value === v}
            onChange={() => !disabled && onChange(v)}
            disabled={disabled}
            className="h-4 w-4 text-[#0f1e35] accent-[#0f1e35]"
          />
          <span className="text-sm">{v ? "Yes" : "No"}</span>
        </label>
      ))}
    </div>
  );
}

// ── Simple Rich Text Editor ───────────────────────────────────────────────────

function SimpleRTE({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  }

  if (disabled) {
    return (
      <div
        className="border border-gray-200 rounded-md p-3 min-h-28 text-sm bg-gray-50 prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: value || "<span class='text-gray-400'>No content</span>" }}
      />
    );
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-[#0f1e35]/30 focus-within:border-[#0f1e35]">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {[
          { cmd: "bold", label: "B", cls: "font-bold" },
          { cmd: "italic", label: "I", cls: "italic" },
          { cmd: "underline", label: "U", cls: "underline" },
        ].map(({ cmd, label, cls }) => (
          <button key={cmd} type="button"
            onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
            className={`w-7 h-7 text-sm ${cls} hover:bg-gray-200 rounded transition-colors`}>
            {label}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }}
          className="px-2 h-7 text-xs hover:bg-gray-200 rounded transition-colors">• List</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }}
          className="px-2 h-7 text-xs hover:bg-gray-200 rounded transition-colors">1. List</button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={(e) => {
          e.preventDefault();
          const url = prompt("Enter URL:");
          if (url) exec("createLink", url);
        }} className="px-2 h-7 text-xs hover:bg-gray-200 rounded transition-colors">Link</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        className="min-h-28 p-3 text-sm focus:outline-none"
      />
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export function RequestDetailsForm({
  prjId, project, initialData, classifications, subClassifications,
  projectTypes, users, clientNames, userRoles, currentUserName, isRCApproved,
}: Props) {
  const router = useRouter();

  // Role checks
  const isITUser = userRoles.includes("IT User");
  const isFacilityUser = userRoles.includes("Facilities User");
  const isReadOnly = isITUser || isFacilityUser || isRCApproved;

  const state = initialData?.state ?? "Draft";
  const isDraft = !initialData || state === "Draft";
  const isSubmitted = !isDraft && state !== "Draft";

  // Form state — auto-populate from project where field is empty
  const [form, setForm] = useState({
    requestDate: initialData?.requestDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    businessRequesterId: initialData?.businessRequesterId ?? "",
    businessSponsorId: initialData?.businessSponsorId ?? "",
    serviceNowProjectNo: initialData?.serviceNowProjectNo ?? project.prjNumber,
    region: initialData?.region ?? project.region ?? "",
    country: initialData?.country ?? project.country ?? "",
    specification: initialData?.specification ?? "",
    projectDescription: initialData?.projectDescription ?? "",
    businessJustification: initialData?.businessJustification ?? "",
    isClientMandated: initialData?.isClientMandated ?? false,
    clientNameFromDropdown: initialData?.clientNameFromDropdown ?? "",
    clientName: initialData?.clientName ?? "",
    isNewlogoNotListed: initialData?.isNewlogoNotListed ?? false,
    clientMandatedComments: initialData?.clientMandatedComments ?? "",
    isFunded: initialData?.isFunded ?? false,
    isClientContractualObligation: initialData?.isClientContractualObligation ?? false,
    capexClassificationId: initialData?.capexClassificationId ? String(initialData.capexClassificationId) : "",
    capexSubClassificationId: initialData?.capexSubClassificationId ? String(initialData.capexSubClassificationId) : "",
    projectTypeId: initialData?.projectTypeId ? String(initialData.projectTypeId) : "",
    goLiveOnDate: initialData?.goLiveOnDate?.slice(0, 10) ?? project.goLiveDate?.slice(0, 10) ?? "",
    googlemapsLocationlink: initialData?.googlemapsLocationlink ?? "",
    scope: initialData?.scope ?? "",
    isNewlogoGrowth: initialData?.isNewlogoGrowth ?? false,
    newlogoGrowth: initialData?.newlogoGrowth ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  // ── Sub-classification filtering ────────────────────────────────────────
  const selectedClassificationName = useMemo(() => {
    const c = classifications.find((c) => String(c.id) === form.capexClassificationId);
    return c?.name ?? "";
  }, [form.capexClassificationId, classifications]);

  const filteredSubClassifications = useMemo(() => {
    const allowed = CLASSIFICATION_SUB_MAP[selectedClassificationName];
    if (!allowed) return subClassifications;
    return subClassifications.filter((s) =>
      allowed.some((a) => s.name.toLowerCase().includes(a.toLowerCase()))
    );
  }, [selectedClassificationName, subClassifications]);

  const selectedSubClassificationName = useMemo(() => {
    const s = subClassifications.find((s) => String(s.id) === form.capexSubClassificationId);
    return s?.name ?? "";
  }, [form.capexSubClassificationId, subClassifications]);

  // Show Enterprise Manpower when Classification=Growth AND SubClassification=Growth
  const showEnterpriseManpower =
    selectedClassificationName === "Growth" &&
    selectedSubClassificationName.toLowerCase().includes("growth");

  // ── Validation ───────────────────────────────────────────────────────────
  function validate() {
    const errs: Record<string, string> = {};
    if (!form.projectDescription.trim()) errs.projectDescription = "Project Description is required.";
    if (!form.businessJustification.trim()) errs.businessJustification = "Business Justification is required.";
    if (!form.capexClassificationId) errs.capexClassificationId = "CapEx Classification is required.";
    if (form.isClientMandated && !form.clientNameFromDropdown && !form.clientName.trim())
      errs.clientName = "Client Name is required when Client Mandated is Yes.";
    if (form.isNewlogoGrowth && !form.newlogoGrowth.trim())
      errs.newlogoGrowth = "New Logo Program / LOB Name is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save / Submit / Update ───────────────────────────────────────────────
  async function save(mode: "draft" | "submit" | "update") {
    if (mode !== "draft" && !validate()) return;

    if (mode === "draft") setSaving(true);
    else if (mode === "submit") setSubmitting(true);
    else setUpdating(true);

    const payload = {
      ...form,
      capexClassificationId: form.capexClassificationId ? Number(form.capexClassificationId) : null,
      capexSubClassificationId: form.capexSubClassificationId ? Number(form.capexSubClassificationId) : null,
      projectTypeId: form.projectTypeId ? Number(form.projectTypeId) : null,
      requestDate: form.requestDate || null,
      goLiveOnDate: form.goLiveOnDate || null,
      ...(mode === "submit" && { state: "Submitted" }),
    };

    try {
      const res = await fetch(`/api/projects/${prjId}/capex`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        if (mode === "submit") router.push(`/projects/${prjId}/capex/types-bpm`);
        else router.refresh();
      }
    } finally {
      setSaving(false);
      setSubmitting(false);
      setUpdating(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">
      <CapexFormHeader
        prjNumber={project.prjNumber}
        projectName={project.name}
        managerName={project.managerName}
        goLiveDate={project.goLiveDate}
        capexState={initialData?.state ?? "Draft"}
      />

      {/* Status banners */}
      {isRCApproved && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          RC Approval completed. This form is now read-only.
        </div>
      )}
      {!isRCApproved && isSubmitted && !isReadOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Form submitted. Use the Update button to make changes until RC Approval.
        </div>
      )}
      {isReadOnly && !isRCApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          You have read-only access to this form.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">

        {/* ── Auto-populated Project Info ─────────────────────────────────── */}
        <section>
          <SectionTitle>Project Information (Auto-Populated)</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReadOnlyField label="Project Number" value={project.prjNumber} />
            <ReadOnlyField label="Project Name" value={project.name} />
            <ReadOnlyField label="Project Manager" value={project.managerName} />
            <ReadOnlyField label="Business PM" value={project.businessOwnerName} />
            <ReadOnlyField label="Start Date" value={project.startDate ? new Date(project.startDate).toLocaleDateString() : null} />
            <ReadOnlyField label="End Date" value={project.endDate ? new Date(project.endDate).toLocaleDateString() : null} />
            <ReadOnlyField label="Region" value={project.region} />
            <ReadOnlyField label="Country" value={project.country} />
            <ReadOnlyField label="Location" value={project.location} />
          </div>
        </section>

        {/* ── Request Information ─────────────────────────────────────────── */}
        <section>
          <SectionTitle>Request Information</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Request Date" required>
              <Input type="date" value={form.requestDate}
                onChange={(e) => set("requestDate", e.target.value)} disabled={isReadOnly} />
            </Field>
            <Field label="Requester Name">
              <Select value={form.businessRequesterId}
                onValueChange={(v) => set("businessRequesterId", v === "_none" ? "" : v)}
                disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select requester..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Business Sponsor">
              <Select value={form.businessSponsorId}
                onValueChange={(v) => set("businessSponsorId", v === "_none" ? "" : v)}
                disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select sponsor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="ServiceNow Project No.">
              <Input value={form.serviceNowProjectNo}
                onChange={(e) => set("serviceNowProjectNo", e.target.value)}
                placeholder="SNW-XXXXX" disabled={isReadOnly} />
            </Field>
            <Field label="Go-Live Target Date">
              <Input type="date" value={form.goLiveOnDate}
                onChange={(e) => set("goLiveOnDate", e.target.value)} disabled={isReadOnly} />
            </Field>
            <Field label="Project Location (Google Maps URL)">
              <Input value={form.googlemapsLocationlink}
                onChange={(e) => set("googlemapsLocationlink", e.target.value)}
                placeholder="https://maps.google.com/..." disabled={isReadOnly} />
            </Field>
          </div>
        </section>

        {/* ── Classification & Type ────────────────────────────────────────── */}
        <section>
          <SectionTitle>Classification & Type</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="CapEx Classification" required>
              <Select value={form.capexClassificationId}
                onValueChange={(v) => {
                  set("capexClassificationId", v === "_none" ? "" : v);
                  set("capexSubClassificationId", ""); // reset sub when parent changes
                }}
                disabled={isReadOnly}>
                <SelectTrigger className={errors.capexClassificationId ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select classification..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {classifications.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.capexClassificationId && <p className="text-xs text-red-500">{errors.capexClassificationId}</p>}
            </Field>

            <Field label="Sub-Classification" hint={selectedClassificationName ? `Showing subs for ${selectedClassificationName}` : undefined}>
              <Select value={form.capexSubClassificationId}
                onValueChange={(v) => set("capexSubClassificationId", v === "_none" ? "" : v)}
                disabled={isReadOnly || !form.capexClassificationId}>
                <SelectTrigger>
                  <SelectValue placeholder={form.capexClassificationId ? "Select sub-classification..." : "Select classification first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {filteredSubClassifications.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Project Type">
              <Select value={form.projectTypeId}
                onValueChange={(v) => set("projectTypeId", v === "_none" ? "" : v)}
                disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select project type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {projectTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Scope">
              <Input value={form.scope}
                onChange={(e) => set("scope", e.target.value)}
                placeholder="Enter scope" disabled={isReadOnly} />
            </Field>
          </div>
        </section>

        {/* ── Enterprise Manpower & Capacity Tracker (conditional) ─────────── */}
        {showEnterpriseManpower && (
          <section className="bg-blue-50/50 border border-blue-100 rounded-lg p-5">
            <SectionTitle>Enterprise Manpower &amp; Capacity Tracker</SectionTitle>
            <p className="text-xs text-blue-600 mb-3">
              Visible because Classification = Growth and Sub-Classification = Growth
            </p>
            <SimpleRTE
              value={form.specification}
              onChange={(v) => set("specification", v)}
              disabled={isReadOnly}
            />
          </section>
        )}

        {/* ── Project Details ──────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Project Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Project Description" required>
              <Textarea value={form.projectDescription}
                onChange={(e) => set("projectDescription", e.target.value)}
                placeholder="Describe the project..."
                rows={4} disabled={isReadOnly}
                className={errors.projectDescription ? "border-red-400" : ""} />
              {errors.projectDescription && <p className="text-xs text-red-500">{errors.projectDescription}</p>}
            </Field>
            <Field label="Business Justification" required>
              <Textarea value={form.businessJustification}
                onChange={(e) => set("businessJustification", e.target.value)}
                placeholder="Justify the business need..."
                rows={4} disabled={isReadOnly}
                className={errors.businessJustification ? "border-red-400" : ""} />
              {errors.businessJustification && <p className="text-xs text-red-500">{errors.businessJustification}</p>}
            </Field>
          </div>
        </section>

        {/* ── Compliance & Funding ─────────────────────────────────────────── */}
        <section>
          <SectionTitle>Compliance &amp; Funding</SectionTitle>
          <div className="space-y-6">

            {/* Client Mandated */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Field label="Client Mandated?">
                  <RadioGroup name="isClientMandated" value={form.isClientMandated}
                    onChange={(v) => set("isClientMandated", v)} disabled={isReadOnly} />
                </Field>

                {form.isClientMandated && (
                  <div className="space-y-3 pl-2 border-l-2 border-blue-200">
                    {/* Client Name from dropdown */}
                    {!form.isNewlogoNotListed && (
                      <Field label="Client Name" required>
                        <Select value={form.clientNameFromDropdown}
                          onValueChange={(v) => set("clientNameFromDropdown", v === "_none" ? "" : v)}
                          disabled={isReadOnly}>
                          <SelectTrigger className={errors.clientName ? "border-red-400" : ""}>
                            <SelectValue placeholder="Select client..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">— Select client —</SelectItem>
                            {clientNames.map((c) => (
                              <SelectItem key={c.id} value={c.clientName}>{c.clientName}</SelectItem>
                            ))}
                            {clientNames.length === 0 && (
                              <SelectItem value="_empty" disabled>No clients loaded</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
                      </Field>
                    )}

                    {/* Not In List */}
                    <label className={cn("flex items-center gap-2 text-sm", isReadOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                      <input type="checkbox" checked={form.isNewlogoNotListed}
                        onChange={(e) => { set("isNewlogoNotListed", e.target.checked); set("clientNameFromDropdown", ""); }}
                        disabled={isReadOnly}
                        className="h-4 w-4 rounded accent-[#0f1e35]" />
                      Not in list — enter manually
                    </label>

                    {/* Manual entry when "Not in list" checked */}
                    {form.isNewlogoNotListed && (
                      <Field label="Client Name (Manual)" required>
                        <Input value={form.clientName}
                          onChange={(e) => set("clientName", e.target.value)}
                          placeholder="Enter client name..."
                          disabled={isReadOnly}
                          className={errors.clientName ? "border-red-400" : ""} />
                        {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
                      </Field>
                    )}
                  </div>
                )}
              </div>

              {/* Client Mandated Comments */}
              <Field label="Client Mandated Comments">
                <Textarea value={form.clientMandatedComments}
                  onChange={(e) => set("clientMandatedComments", e.target.value)}
                  placeholder="Add comments or justification..."
                  rows={4} disabled={isReadOnly} />
              </Field>
            </div>

            {/* Client Funded */}
            <div className="space-y-3">
              <Field label="Client Funded?">
                <RadioGroup name="isFunded" value={form.isFunded}
                  onChange={(v) => set("isFunded", v)} disabled={isReadOnly} />
              </Field>
              {form.isFunded && (
                <div className="pl-2 border-l-2 border-green-200">
                  {initialData?.id ? (
                    <FileUploadZone
                      capExRequestId={initialData.id}
                      sectionId="ClientFundedFileUpload"
                      label="Client Funded — Attachment (Required)"
                      disabled={isReadOnly}
                    />
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      Save the form as Draft first to enable file uploads.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Client Contractual Obligation */}
            <div className="space-y-3">
              <Field label="Client Contractual Obligation?">
                <RadioGroup name="isClientContractualObligation" value={form.isClientContractualObligation}
                  onChange={(v) => set("isClientContractualObligation", v)} disabled={isReadOnly} />
              </Field>
              {form.isClientContractualObligation && (
                <div className="pl-2 border-l-2 border-purple-200">
                  {initialData?.id ? (
                    <FileUploadZone
                      capExRequestId={initialData.id}
                      sectionId="ClientContractualObligationFileUpload"
                      label="Contractual Obligation — Attachment (Required)"
                      disabled={isReadOnly}
                    />
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      Save the form as Draft first to enable file uploads.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* New Logo Growth */}
            <div className="space-y-3">
              <Field label="New Logo Growth?">
                <RadioGroup name="isNewlogoGrowth" value={form.isNewlogoGrowth}
                  onChange={(v) => set("isNewlogoGrowth", v)} disabled={isReadOnly} />
              </Field>
              {form.isNewlogoGrowth && (
                <div className="pl-2 border-l-2 border-orange-200">
                  <Field label="New Logo Program / LOB Name" required>
                    <Input value={form.newlogoGrowth}
                      onChange={(e) => set("newlogoGrowth", e.target.value)}
                      placeholder="Enter program / LOB name..."
                      disabled={isReadOnly}
                      className={errors.newlogoGrowth ? "border-red-400" : ""} />
                    {errors.newlogoGrowth && <p className="text-xs text-red-500">{errors.newlogoGrowth}</p>}
                  </Field>
                </div>
              )}
            </div>

          </div>
        </section>
      </div>

      {/* ── Action Buttons ───────────────────────────────────────────────────── */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 justify-end bg-white rounded-lg border border-gray-200 px-6 py-4">
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved successfully</span>}

          {Object.keys(errors).length > 0 && (
            <span className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Please fix the errors above.
            </span>
          )}

          {isDraft ? (
            // Draft mode: Save Draft + Submit
            <>
              <Button variant="outline" onClick={() => save("draft")}
                disabled={saving || submitting} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button onClick={() => save("submit")}
                disabled={saving || submitting}
                className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f] text-white">
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          ) : (
            // Submitted mode: Update only (until RC Approval)
            <Button onClick={() => save("update")}
              disabled={updating}
              className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f] text-white">
              <RefreshCw className={cn("h-4 w-4", updating && "animate-spin")} />
              {updating ? "Updating..." : "Update"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
