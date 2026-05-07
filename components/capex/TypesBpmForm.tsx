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
import { FileUploadZone } from "./FileUploadZone";
import { Save, Send, RefreshCw, Lock, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Attachment {
  id: string;
  fileName: string;
  fileContent: string;
}

interface InitialData {
  isIt: boolean;
  isFacilities: boolean;
  isPhysicalSecurity: boolean;
  itPmId: string | null;
  itPmCreateDate: string | null;
  facilitiesPmId: string | null;
  facilitiesPmCreateDate: string | null;
  physicalSecurityPmId: string | null;
  physicalSecurityPmCreateDate: string | null;
  isPnL: boolean;
  pnlComment: string | null;
  status: string;
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
  userRoles: string[];
  users: User[];
  initialAttachments: Attachment[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
      {children}
    </h3>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
    </div>
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

export function TypesBpmForm({
  prjId,
  capexId,
  project,
  initialData,
  capexState,
  isRCApproved,
  userRoles,
  users,
  initialAttachments,
}: Props) {
  const router = useRouter();

  // Role flags
  const isGovernanceManager = userRoles.includes("Governance Manager");
  const isBusinessManager = userRoles.includes("Business Manager");
  const isITUser = userRoles.includes("IT User") || userRoles.includes("IT Manager");
  const isFacilityUser =
    userRoles.includes("Facilities User") || userRoles.includes("Facilities Manager");
  const canFullEdit = isGovernanceManager || isBusinessManager;
  const canEditIT = canFullEdit || isITUser;
  const canEditFacilities = canFullEdit || isFacilityUser;
  const canEditSecurity = canFullEdit || userRoles.includes("Security Manager");

  // Section is disabled if Request Details hasn't been submitted yet
  const requestDetailsNotSubmitted = capexState === "Draft";

  // Status-based button logic
  const bpmStatus = initialData?.status ?? "Draft";
  const isDraft = bpmStatus === "Draft" || !initialData;
  const isSubmitted = bpmStatus === "Submitted" || bpmStatus === "Approved";
  const isReadOnly = isRCApproved || requestDetailsNotSubmitted;

  const [form, setForm] = useState({
    isIt: initialData?.isIt ?? false,
    isFacilities: initialData?.isFacilities ?? false,
    isPhysicalSecurity: initialData?.isPhysicalSecurity ?? false,
    itPmId: initialData?.itPmId ?? "",
    itPmCreateDate: initialData?.itPmCreateDate ?? null as string | null,
    facilitiesPmId: initialData?.facilitiesPmId ?? "",
    facilitiesPmCreateDate: initialData?.facilitiesPmCreateDate ?? null as string | null,
    physicalSecurityPmId: initialData?.physicalSecurityPmId ?? "",
    physicalSecurityPmCreateDate: initialData?.physicalSecurityPmCreateDate ?? null as string | null,
    isPnL: initialData?.isPnL ?? false,
    pnlComment: initialData?.pnlComment ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function handleCheckbox(
    key: "isIt" | "isFacilities" | "isPhysicalSecurity",
    checked: boolean
  ) {
    setField(key, checked);
    // Clear dependent PM when unchecked
    if (!checked) {
      if (key === "isIt") {
        setField("itPmId", "");
        setField("itPmCreateDate", null);
      }
      if (key === "isFacilities") {
        setField("facilitiesPmId", "");
        setField("facilitiesPmCreateDate", null);
      }
      if (key === "isPhysicalSecurity") {
        setField("physicalSecurityPmId", "");
        setField("physicalSecurityPmCreateDate", null);
      }
    }
  }

  function handlePmSelect(
    pmKey: "itPmId" | "facilitiesPmId" | "physicalSecurityPmId",
    dateKey: "itPmCreateDate" | "facilitiesPmCreateDate" | "physicalSecurityPmCreateDate",
    value: string
  ) {
    const resolved = value === "_none" ? "" : value;
    setField(pmKey, resolved);
    // Auto-set assigned date when a PM is selected
    setField(dateKey, resolved ? new Date().toISOString() : null);
  }

  function validate(submit: boolean) {
    const errs: Record<string, string> = {};
    if (submit) {
      if (form.isIt && !form.itPmId) errs.itPmId = "IT Functional Leader is required.";
      if (form.isFacilities && !form.facilitiesPmId)
        errs.facilitiesPmId = "Facilities Functional Leader is required.";
      if (form.isPhysicalSecurity && !form.physicalSecurityPmId)
        errs.physicalSecurityPmId = "Physical Security Functional Leader is required.";
      if (form.isPnL && !form.pnlComment.trim())
        errs.pnlComment = "Profit & Loss comment is required when P&L is Yes.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save(mode: "draft" | "submit" | "update") {
    if (!validate(mode === "submit")) return;

    if (mode === "draft") setSaving(true);
    else if (mode === "submit") setSubmitting(true);
    else setUpdating(true);

    const payload = {
      isIt: form.isIt,
      isFacilities: form.isFacilities,
      isPhysicalSecurity: form.isPhysicalSecurity,
      itPmId: form.itPmId || null,
      itPmCreateDate: form.itPmCreateDate,
      facilitiesPmId: form.facilitiesPmId || null,
      facilitiesPmCreateDate: form.facilitiesPmCreateDate,
      physicalSecurityPmId: form.physicalSecurityPmId || null,
      physicalSecurityPmCreateDate: form.physicalSecurityPmCreateDate,
      isRoiRequired: form.isPnL,
      roiComment: form.pnlComment || null,
      ...(mode === "submit" && { status: "Submitted" }),
    };

    try {
      const res = await fetch(`/api/projects/${prjId}/capex/business-pm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        if (mode === "submit") {
          router.push(`/projects/${prjId}/capex/functional/it`);
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

  const sections: {
    checkKey: "isIt" | "isFacilities" | "isPhysicalSecurity";
    label: string;
    pmKey: "itPmId" | "facilitiesPmId" | "physicalSecurityPmId";
    dateKey: "itPmCreateDate" | "facilitiesPmCreateDate" | "physicalSecurityPmCreateDate";
    canEdit: boolean;
    description: string;
  }[] = [
    {
      checkKey: "isIt",
      label: "IT",
      pmKey: "itPmId",
      dateKey: "itPmCreateDate",
      canEdit: canEditIT,
      description: "Information Technology functional area",
    },
    {
      checkKey: "isFacilities",
      label: "Facilities",
      pmKey: "facilitiesPmId",
      dateKey: "facilitiesPmCreateDate",
      canEdit: canEditFacilities,
      description: "Facilities management functional area",
    },
    {
      checkKey: "isPhysicalSecurity",
      label: "Physical Security",
      pmKey: "physicalSecurityPmId",
      dateKey: "physicalSecurityPmCreateDate",
      canEdit: canEditSecurity,
      description: "Physical security functional area",
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

      {/* Disabled overlay notice */}
      {requestDetailsNotSubmitted && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong>Request Details must be submitted first.</strong> This section will be enabled
            once the Request Details form has been submitted.
          </span>
        </div>
      )}

      {/* RC Approved notice */}
      {isRCApproved && !requestDetailsNotSubmitted && (
        <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This section is read-only — RC Finance approval has been completed.</span>
        </div>
      )}

      <div className={`space-y-6 ${requestDetailsNotSubmitted ? "opacity-50 pointer-events-none select-none" : ""}`}>
        {/* CapEx Type Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SectionTitle>CapEx Type Selection</SectionTitle>
          <p className="text-sm text-gray-500 mb-5">
            Select all functional areas that apply to this capital expenditure request.
          </p>

          <div className="space-y-4">
            {sections.map(({ checkKey, label, pmKey, dateKey, canEdit, description }) => {
              const isChecked = form[checkKey];
              const pmValue = form[pmKey];
              const dateValue = form[dateKey];
              const selectedUser = users.find((u) => u.id === pmValue);
              const sectionReadOnly = isReadOnly || !canEdit;

              return (
                <div
                  key={checkKey}
                  className={`rounded-lg border transition-colors ${
                    isChecked ? "border-blue-200 bg-blue-50/30" : "border-gray-200 bg-white"
                  }`}
                >
                  {/* Checkbox header */}
                  <div className="flex items-start gap-3 p-4">
                    <Checkbox
                      id={checkKey}
                      checked={isChecked}
                      onCheckedChange={(v) => {
                        if (!sectionReadOnly) handleCheckbox(checkKey, Boolean(v));
                      }}
                      disabled={sectionReadOnly}
                      className="mt-0.5"
                    />
                    <div>
                      <label
                        htmlFor={checkKey}
                        className={`text-sm font-semibold text-gray-800 ${!sectionReadOnly ? "cursor-pointer" : ""}`}
                      >
                        {label}
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                  </div>

                  {/* Functional Leader section — shown when checked */}
                  {isChecked && (
                    <div className="border-t border-blue-100 px-4 pb-4 pt-3 bg-white rounded-b-lg">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        {label} Functional Leader
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Name dropdown */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-700">
                            Name <span className="text-red-500">*</span>
                          </Label>
                          {sectionReadOnly ? (
                            <p className="text-sm text-gray-800 font-medium">
                              {selectedUser?.name ?? "—"}
                            </p>
                          ) : (
                            <Select
                              value={pmValue || "_none"}
                              onValueChange={(v) => handlePmSelect(pmKey, dateKey, v)}
                            >
                              <SelectTrigger className={`w-full ${errors[pmKey] ? "border-red-400" : ""}`}>
                                <SelectValue placeholder="Select leader..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">— Select —</SelectItem>
                                {users.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {errors[pmKey] && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {errors[pmKey]}
                            </p>
                          )}
                        </div>

                        {/* Email — auto-populated */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-700">Email</Label>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 border border-gray-200 min-h-[38px]">
                            {selectedUser?.email ?? "—"}
                          </p>
                        </div>

                        {/* Assigned Date — auto-captured */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-700">Assigned Date</Label>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 border border-gray-200 min-h-[38px]">
                            {formatDate(dateValue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Profit & Loss Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <SectionTitle>Profit &amp; Loss</SectionTitle>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Profit &amp; Loss Required?
            </Label>
            <div className="flex gap-6">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isPnL"
                    checked={form.isPnL === v}
                    onChange={() => {
                      if (!isReadOnly) setField("isPnL", v);
                    }}
                    disabled={isReadOnly}
                    className="h-4 w-4 text-[#0f1e35] accent-[#0f1e35]"
                  />
                  <span className="text-sm">{v ? "Yes" : "No"}</span>
                </label>
              ))}
            </div>
          </div>

          {form.isPnL && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Profit &amp; Loss Comment{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={form.pnlComment}
                  onChange={(e) => setField("pnlComment", e.target.value)}
                  placeholder="Enter business P&L justification and financial impact comments..."
                  rows={4}
                  disabled={isReadOnly}
                  className={errors.pnlComment ? "border-red-400" : ""}
                />
                {errors.pnlComment && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.pnlComment}
                  </p>
                )}
              </div>

              {/* P&L Attachment — mandatory when P&L = Yes */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  P&amp;L Attachment <span className="text-red-500">*</span>
                </Label>
                {capexId ? (
                  <FileUploadZone
                    capExRequestId={capexId}
                    sectionId="AttachFilesROIRequired"
                    disabled={isReadOnly}
                    label=""
                  />
                ) : (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Save a draft of Request Details first to enable file uploads.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* General Attachments */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SectionTitle>Attachments</SectionTitle>
          {capexId ? (
            <FileUploadZone
              capExRequestId={capexId}
              sectionId="BusinessPMFileUpload"
              initialAttachments={initialAttachments}
              disabled={isReadOnly}
              label=""
            />
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Save a draft of Request Details first to enable file uploads.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {!isReadOnly && (
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
    </div>
  );
}
