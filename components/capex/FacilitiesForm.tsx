"use client";

import { useEffect, useRef, useState } from "react";
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
import { FileUploadZone } from "./FileUploadZone";
import {
  Save,
  Send,
  RefreshCw,
  Lock,
  AlertCircle,
  MessageSquare,
  Send as SendIcon,
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
  facilitiesApprovedDate: string | null;
  leaseRegion: string | null;
  leaseLocation: string | null;
  leaseDetails: string | null;
  leaseTerms: string | null;
  leaseTermsConditions: string | null;
  totalLeaseValue: number | null;
  currentYearOpexImpact: number | null;
  facilitiesSessionStatus: string | null;
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

function RequiredMark() {
  return <span className="text-red-500 ml-0.5">*</span>;
}

function fmt(v: number | string | null | undefined): string {
  if (v === null || v === "" || v === undefined) return "";
  return String(v);
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

function fmtMoney(v: number) {
  return v !== 0
    ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";
}

function costPerSeat(total: string, seats: string): string {
  const t = Number(total);
  const s = Number(seats);
  if (!t || !s) return "—";
  return `$${(t / s).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

export function FacilitiesForm({
  prjId,
  capexId,
  project,
  initialData,
  capexState,
  isRCApproved,
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
  const isFacilitiesManager = userRoles.includes("Facilities Manager");
  const isFacilitiesLeadership = userRoles.includes("Facilities Leadership");
  const isBusinessRequester =
    userRoles.includes("Business Manager") || userRoles.includes("Business Requester");
  const canEdit =
    isGovernanceManager || isFacilitiesManager || isFacilitiesLeadership || isBusinessRequester;
  const canApprove = isGovernanceManager || isFacilitiesManager || isFacilitiesLeadership;

  const sessionStatus = initialData?.facilitiesSessionStatus ?? "Draft";
  const isDraft = sessionStatus === "Draft" || !initialData;
  const isSubmitted = sessionStatus === "Submitted" || sessionStatus === "Approved";
  const isReadOnly = isRCApproved || !canEdit;
  const costFieldsLocked = isSubmitted || isReadOnly;

  const [form, setForm] = useState({
    construction: fmt(initialData?.construction),
    constructionSeats: fmt(initialData?.constructionSeats),
    electricalCabling: fmt(initialData?.electricalCabling),
    electricalCablingSeats: fmt(initialData?.electricalCablingSeats),
    furnitureFixture: fmt(initialData?.furnitureFixture),
    furnitureFixtureSeats: fmt(initialData?.furnitureFixtureSeats),
    others: fmt(initialData?.others),
    othersSeats: fmt(initialData?.othersSeats),
    tenantImprovementAllowance: fmt(initialData?.tenantImprovementAllowance),
    isExistingInventoryEvaluatedFac: initialData?.isExistingInventoryEvaluatedFac ?? null as boolean | null,
    isCompetitiveBidFac: initialData?.isCompetitiveBidFac ?? null as boolean | null,
    facilitiesLeadApproverId: initialData?.facilitiesLeadApproverId ?? "",
    facilitiesStatus: initialData?.facilitiesStatus ?? "",
    facilitiesApprovedDate: initialData?.facilitiesApprovedDate ?? null as string | null,
    facilitiesApprovedByName: "" as string, // local display only — no DB field
    leaseRegion: initialData?.leaseRegion ?? "",
    leaseLocation: initialData?.leaseLocation ?? "",
    leaseDetails: initialData?.leaseDetails ?? "",
    leaseTerms: initialData?.leaseTerms ?? "",
    leaseTermsConditions: initialData?.leaseTermsConditions ?? "",
    totalLeaseValue: fmt(initialData?.totalLeaseValue),
    currentYearOpexImpact: fmt(initialData?.currentYearOpexImpact),
    documentSummary: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
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
    setErrors((e) => {
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  function handleStatusChange(value: string) {
    const resolved = value === "_none" ? "" : value;
    setField("facilitiesStatus", resolved);
    if (resolved === "ApprovedbyLeadership" && canApprove) {
      setField("facilitiesApprovedDate", new Date().toISOString());
      setField("facilitiesApprovedByName", currentUserName);
    } else if (resolved !== "ApprovedbyLeadership") {
      setField("facilitiesApprovedDate", null);
      setField("facilitiesApprovedByName", "");
    }
  }

  function validateTIA(value: string) {
    const n = Number(value);
    if (value && n > 0) {
      setErrors((e) => ({ ...e, tenantImprovementAllowance: "TIA must be a negative value." }));
    } else {
      setErrors((e) => {
        const next = { ...e };
        delete next.tenantImprovementAllowance;
        return next;
      });
    }
    setField("tenantImprovementAllowance", value);
  }

  function validate(submit: boolean): boolean {
    if (!submit) return true;
    const errs: Record<string, string> = {};
    if (!form.leaseRegion.trim()) errs.leaseRegion = "Region is required.";
    if (!form.leaseLocation.trim()) errs.leaseLocation = "Location is required.";
    if (!form.leaseDetails.trim()) errs.leaseDetails = "Details is required.";
    if (!form.leaseTerms.trim()) errs.leaseTerms = "Terms is required.";
    if (!form.leaseTermsConditions.trim()) errs.leaseTermsConditions = "Terms & Conditions is required.";
    if (!form.totalLeaseValue) errs.totalLeaseValue = "Total Lease Value is required.";
    if (!form.currentYearOpexImpact.trim()) errs.currentYearOpexImpact = "Current Year OPEX Impact is required.";
    const tia = Number(form.tenantImprovementAllowance);
    if (form.tenantImprovementAllowance && tia > 0)
      errs.tenantImprovementAllowance = "TIA must be a negative value.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Cost calculations
  const constructionAmt = Number(form.construction) || 0;
  const electricalAmt = Number(form.electricalCabling) || 0;
  const furnitureAmt = Number(form.furnitureFixture) || 0;
  const othersAmt = Number(form.others) || 0;
  const grossTotal = constructionAmt + electricalAmt + furnitureAmt + othersAmt;
  const tiaVal = Number(form.tenantImprovementAllowance) || 0;
  const netOfTia = grossTotal + tiaVal; // TIA is negative

  const constructionSeats = Number(form.constructionSeats) || 0;
  const electricalSeats = Number(form.electricalCablingSeats) || 0;
  const furnitureSeats = Number(form.furnitureFixtureSeats) || 0;
  const othersSeats = Number(form.othersSeats) || 0;
  const avgSeats = (constructionSeats + electricalSeats + furnitureSeats + othersSeats) / 4;
  const costPerSeatCalc = avgSeats > 0 ? grossTotal / avgSeats : 0;

  async function save(mode: "draft" | "submit" | "update") {
    if (!validate(mode === "submit")) return;
    if (mode === "draft") setSaving(true);
    else if (mode === "submit") setSubmitting(true);
    else setUpdating(true);

    const numericFields = [
      "construction", "constructionSeats",
      "electricalCabling", "electricalCablingSeats",
      "furnitureFixture", "furnitureFixtureSeats",
      "others", "othersSeats",
      "tenantImprovementAllowance", "totalLeaseValue",
    ];

    const payload: Record<string, unknown> = {
      section: "facilities",
      construction: form.construction !== "" ? Number(form.construction) : null,
      constructionSeats: form.constructionSeats !== "" ? Number(form.constructionSeats) : null,
      electricalCabling: form.electricalCabling !== "" ? Number(form.electricalCabling) : null,
      electricalCablingSeats: form.electricalCablingSeats !== "" ? Number(form.electricalCablingSeats) : null,
      furnitureFixture: form.furnitureFixture !== "" ? Number(form.furnitureFixture) : null,
      furnitureFixtureSeats: form.furnitureFixtureSeats !== "" ? Number(form.furnitureFixtureSeats) : null,
      others: form.others !== "" ? Number(form.others) : null,
      othersSeats: form.othersSeats !== "" ? Number(form.othersSeats) : null,
      tenantImprovementAllowance: form.tenantImprovementAllowance !== "" ? Number(form.tenantImprovementAllowance) : null,
      totalLeaseValue: form.totalLeaseValue !== "" ? Number(form.totalLeaseValue) : null,
      currentYearOpexImpact: form.currentYearOpexImpact !== "" ? Number(form.currentYearOpexImpact) : null,
      isExistingInventoryEvaluatedFac: form.isExistingInventoryEvaluatedFac,
      isCompetitiveBidFac: form.isCompetitiveBidFac,
      facilitiesLeadApproverId: form.facilitiesLeadApproverId || null,
      facilitiesStatus: form.facilitiesStatus || null,
      facilitiesApprovedDate: form.facilitiesApprovedDate,
      leaseRegion: form.leaseRegion || null,
      leaseLocation: form.leaseLocation || null,
      leaseDetails: form.leaseDetails || null,
      leaseTerms: form.leaseTerms || null,
      leaseTermsConditions: form.leaseTermsConditions || null,
      ...(mode === "submit" && { facilitiesSessionStatus: "Submitted" }),
    };

    // Suppress unused variable warning
    void numericFields;

    try {
      const res = await fetch(`/api/projects/${prjId}/capex/section-details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        if (mode === "submit") {
          router.push(`/projects/${prjId}/capex/functional/security`);
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
        body: JSON.stringify({ comment: newComment.trim(), categoryType: "FacilitiesPMSection" }),
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

  const costRows: { label: string; totalKey: keyof typeof form; seatsKey: keyof typeof form }[] = [
    { label: "Construction", totalKey: "construction", seatsKey: "constructionSeats" },
    { label: "Electrical / Cabling", totalKey: "electricalCabling", seatsKey: "electricalCablingSeats" },
    { label: "Furniture & Fixture", totalKey: "furnitureFixture", seatsKey: "furnitureFixtureSeats" },
    { label: "Others", totalKey: "others", seatsKey: "othersSeats" },
  ];

  const isApprovedStatus = form.facilitiesStatus === "ApprovedbyLeadership";
  const leadApproverUser = users.find((u) => u.id === form.facilitiesLeadApproverId);

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
            Facilities Summary has been submitted. Comments and Document Summary remain editable.
          </span>
        </div>
      )}

      {/* Facilities Cost Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Facilities Cost Summary</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-48">Category</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-36">Amount ($)</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-36">No. of Seats / Hours</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 w-32">Cost Per Seat</th>
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
                      min="0"
                      value={form[row.totalKey] as string}
                      onChange={(e) => setField(row.totalKey, e.target.value)}
                      disabled={costFieldsLocked}
                      className="text-right w-full"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min="0"
                      value={form[row.seatsKey] as string}
                      onChange={(e) => setField(row.seatsKey, e.target.value)}
                      disabled={costFieldsLocked}
                      className="text-right w-full"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 font-medium">
                    {costPerSeat(form[row.totalKey] as string, form[row.seatsKey] as string)}
                  </td>
                </tr>
              ))}

              {/* Total Gross Facilities Spend */}
              <tr className="bg-gray-50 font-semibold text-gray-800">
                <td className="px-4 py-3">Total Gross Facilities Spend</td>
                <td className="px-4 py-3 text-right">{fmtMoney(grossTotal)}</td>
                <td className="px-4 py-3 text-right text-gray-600 text-sm font-normal">
                  Avg: {avgSeats > 0 ? avgSeats.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {costPerSeatCalc > 0 ? fmtMoney(costPerSeatCalc) : "—"}
                </td>
              </tr>

              {/* TIA row */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700 font-medium">
                  Tenant Improvement Allowance (TIA)
                  <span className="text-xs text-gray-400 ml-1">(enter as negative)</span>
                </td>
                <td className="px-4 py-3" colSpan={3}>
                  <div className="flex items-start gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.tenantImprovementAllowance}
                      onChange={(e) => validateTIA(e.target.value)}
                      disabled={costFieldsLocked}
                      className={`text-right w-36 ${errors.tenantImprovementAllowance ? "border-red-400" : ""}`}
                      placeholder="-0.00"
                    />
                    {errors.tenantImprovementAllowance && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-2">
                        <AlertCircle className="h-3 w-3" />
                        {errors.tenantImprovementAllowance}
                      </p>
                    )}
                  </div>
                </td>
              </tr>

              {/* Net of TIA */}
              <tr className="bg-[#0f1e35]/5 font-semibold text-gray-800">
                <td className="px-4 py-3">Facilities Spend Net of TIA</td>
                <td className="px-4 py-3 text-right">{fmtMoney(netOfTia)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lease Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Lease Information</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Region */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Region <RequiredMark />
            </Label>
            <Input
              value={form.leaseRegion}
              onChange={(e) => setField("leaseRegion", e.target.value)}
              disabled={costFieldsLocked}
              placeholder="e.g. Americas"
              className={errors.leaseRegion ? "border-red-400" : ""}
            />
            {errors.leaseRegion && (
              <p className="text-xs text-red-500">{errors.leaseRegion}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Location <RequiredMark />
            </Label>
            <Input
              value={form.leaseLocation}
              onChange={(e) => setField("leaseLocation", e.target.value)}
              disabled={costFieldsLocked}
              placeholder="e.g. New York"
              className={errors.leaseLocation ? "border-red-400" : ""}
            />
            {errors.leaseLocation && (
              <p className="text-xs text-red-500">{errors.leaseLocation}</p>
            )}
          </div>

          {/* Total Lease Value */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Total Lease Value ($) <RequiredMark />
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.totalLeaseValue}
              onChange={(e) => setField("totalLeaseValue", e.target.value)}
              disabled={costFieldsLocked}
              placeholder="0.00"
              className={errors.totalLeaseValue ? "border-red-400" : ""}
            />
            {errors.totalLeaseValue && (
              <p className="text-xs text-red-500">{errors.totalLeaseValue}</p>
            )}
          </div>

          {/* Current Year OPEX Impact */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Current Year OPEX Impact <RequiredMark />
            </Label>
            <Input
              value={form.currentYearOpexImpact}
              onChange={(e) => setField("currentYearOpexImpact", e.target.value)}
              disabled={costFieldsLocked}
              placeholder="Describe OPEX impact..."
              className={errors.currentYearOpexImpact ? "border-red-400" : ""}
            />
            {errors.currentYearOpexImpact && (
              <p className="text-xs text-red-500">{errors.currentYearOpexImpact}</p>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm font-medium text-gray-700">
              Details <RequiredMark />
            </Label>
            <Textarea
              value={form.leaseDetails}
              onChange={(e) => setField("leaseDetails", e.target.value)}
              disabled={costFieldsLocked}
              rows={3}
              placeholder="Lease details..."
              className={errors.leaseDetails ? "border-red-400" : ""}
            />
            {errors.leaseDetails && (
              <p className="text-xs text-red-500">{errors.leaseDetails}</p>
            )}
          </div>

          {/* Terms */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Terms <RequiredMark />
            </Label>
            <Textarea
              value={form.leaseTerms}
              onChange={(e) => setField("leaseTerms", e.target.value)}
              disabled={costFieldsLocked}
              rows={3}
              placeholder="e.g. 5-year lease, renewable..."
              className={errors.leaseTerms ? "border-red-400" : ""}
            />
            {errors.leaseTerms && (
              <p className="text-xs text-red-500">{errors.leaseTerms}</p>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Terms &amp; Conditions <RequiredMark />
            </Label>
            <Textarea
              value={form.leaseTermsConditions}
              onChange={(e) => setField("leaseTermsConditions", e.target.value)}
              disabled={costFieldsLocked}
              rows={3}
              placeholder="Lease terms and conditions..."
              className={errors.leaseTermsConditions ? "border-red-400" : ""}
            />
            {errors.leaseTermsConditions && (
              <p className="text-xs text-red-500">{errors.leaseTermsConditions}</p>
            )}
          </div>
        </div>
      </div>

      {/* Facilities Lead Approver */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Facilities Lead Approver</SectionTitle>
        <div
          className={`rounded-lg border p-4 ${
            isApprovedStatus ? "border-green-200 bg-green-50/30" : "border-gray-200"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Lead Approver */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Lead Approver
              </Label>
              {costFieldsLocked || !canApprove ? (
                <p className="text-sm text-gray-800">{leadApproverUser?.name ?? "—"}</p>
              ) : (
                <Select
                  value={form.facilitiesLeadApproverId || "_none"}
                  onValueChange={(v) =>
                    setField("facilitiesLeadApproverId", v === "_none" ? "" : v)
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

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </Label>
              {isReadOnly ? (
                <p className="text-sm text-gray-800">{form.facilitiesStatus || "—"}</p>
              ) : (
                <Select
                  value={form.facilitiesStatus || "_none"}
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

            {/* Approved By */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Approved By
              </Label>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2 border border-gray-200 min-h-[38px]">
                {isApprovedStatus
                  ? form.facilitiesApprovedByName || currentUserName
                  : "—"}
              </p>
            </div>

            {/* Approved Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Approved Date
              </Label>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2 border border-gray-200 min-h-[38px]">
                {isApprovedStatus ? formatDate(form.facilitiesApprovedDate) : "—"}
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
              key: "isExistingInventoryEvaluatedFac" as const,
              label: "Is existing inventory evaluated / exhausted?",
            },
            {
              key: "isCompetitiveBidFac" as const,
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
            sectionId="AttachFilesFacilities"
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
