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
import { FileUploadZone } from "./FileUploadZone";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Plus,
  Trash2,
  Hash,
  ChevronDown,
  ChevronRight,
  Mail,
  Lock,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommentEntry {
  id: string;
  comments: string | null;
  createdByName: string;
  createdOn: string;
}

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

interface ITSummary {
  infrastructureCostTotal: number;
  eusCostTotal: number;
  capitalLaborCostTotal: number;
  infrastructureCostSeats: number;
  eusCostSeats: number;
  capitalLaborCostSeats: number;
  itComments: string | null;
}

interface FacilitiesSummary {
  construction: number;
  electricalCabling: number;
  furnitureFixture: number;
  others: number;
  constructionSeats: number;
  electricalCablingSeats: number;
  furnitureFixtureSeats: number;
  othersSeats: number;
  tenantImprovementAllowance: number;
  grossTotal: number;
  netTotal: number;
}

interface SecuritySummary {
  securityTotal: number;
  securitySeats: number;
}

interface LeaseSummary {
  leaseRegion: string | null;
  leaseLocation: string | null;
  leaseDetails: string | null;
  leaseTerms: string | null;
  leaseTermsConditions: string | null;
  totalLeaseValue: number;
  currentYearOpexImpact: number;
}

interface ClientInfo {
  businessSponsorName: string | null;
  businessRequesterName: string | null;
  projectDescription: string | null;
  businessJustification: string | null;
  isClientMandated: boolean | null;
  isFunded: boolean | null;
  requestStatus: string | null;
}

interface FinanceData {
  id: string;
  isBudget: boolean | null;
  explanation: string | null;
  regCorpFinanceApproverId: string | null;
  regionalApprovalStatusId: string | null;
  regCorpApproveById: string | null;
  regCorpApprovedByName: string | null;
  regCorpApproverDate: string | null;
  vpFinanceApproverId: string | null;
  vpFinanceApprovalStatusId: string | null;
  vpApprovedDate: string | null;
  vpApprovedById: string | null;
  vpApprovedByName: string | null;
  projectCapex: string | null;
  statusRC: string | null;
  statusVP: string | null;
}

interface Totals {
  it: number;
  itSeats: number;
  facilities: number;
  facSeats: number;
  security: number;
  secSeats: number;
}

interface Props {
  prjId: string;
  capexId: string | null;
  project: { prjNumber: string; name: string; managerName: string | null; goLiveDate: string | null };
  grandTotal: number;
  totals: Totals;
  sectionSummary: {
    it: ITSummary;
    facilities: FacilitiesSummary;
    security: SecuritySummary;
    lease: LeaseSummary;
  } | null;
  clientInfo: ClientInfo | null;
  bpm: { isIt: boolean; isFacilities: boolean; isPhysicalSecurity: boolean } | null;
  capexState: string;
  financeData: FinanceData | null;
  ecMembers: EcMember[];
  relatedCapex: RelatedCapexItem[];
  users: { id: string; name: string; email: string }[];
  currentUserId: string;
  currentUserName: string;
  userRoles: string[];
  rcComments: CommentEntry[];
  vpComments: CommentEntry[];
  initialAttachments: { id: string; fileName: string; fileContent: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FINANCE_ROLES = [
  "Finance Lead",
  "RC Finance Approver",
  "VP Finance Approver",
  "EC Approver",
  "Governance Manager",
  "Business Manager",
];

const RC_VP_STATUSES = ["InProgress", "Approved", "Rejected"];

function fmt(v: number): string {
  if (!v) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtNum(v: number): string {
  if (!v) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function cps(amount: number, seats: number): string {
  if (!seats || !amount) return "—";
  return fmt(amount / seats);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(
  status: string
): "completed" | "pending" | "delayed" | "in-progress" {
  if (status === "Approved") return "completed";
  if (status === "Rejected") return "delayed";
  if (status === "InProgress") return "in-progress";
  return "pending";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
      {children}
    </h3>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 w-44 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value || "—"}</span>
    </div>
  );
}

function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          {title}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function CommentHistory({ comments }: { comments: CommentEntry[] }) {
  if (!comments.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="bg-gray-50 rounded-md px-3 py-2 text-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="font-medium text-gray-700">{c.createdByName}</span>
            <span>{fmtDate(c.createdOn)}</span>
          </div>
          <p className="text-gray-700">{c.comments}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinanceReviewForm({
  prjId,
  capexId,
  project,
  grandTotal,
  totals,
  sectionSummary,
  clientInfo,
  bpm,
  capexState,
  financeData,
  ecMembers: initialEcMembers,
  relatedCapex: initialRelatedCapex,
  users,
  currentUserId,
  currentUserName,
  userRoles,
  rcComments: initialRcComments,
  vpComments: initialVpComments,
  initialAttachments,
}: Props) {
  const requiresEC = grandTotal > 25000;
  const canEdit = userRoles.some((r) => FINANCE_ROLES.includes(r));

  // ── Budget state ──
  const [isBudget, setIsBudget] = useState<boolean | null>(
    financeData?.isBudget ?? null
  );
  const [explanation, setExplanation] = useState(
    financeData?.explanation ?? ""
  );
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  // ── RC Finance state ──
  const [rc, setRC] = useState({
    approverId: financeData?.regCorpFinanceApproverId ?? "",
    statusId: financeData?.regionalApprovalStatusId ?? "",
    approveById: financeData?.regCorpApproveById ?? "",
    approveByName: financeData?.regCorpApprovedByName ?? "",
    approveDate: financeData?.regCorpApproverDate ?? "",
  });
  const [savingRC, setSavingRC] = useState(false);
  const [rcSaved, setRCSaved] = useState(false);

  // ── VP Finance state ──
  const [vp, setVP] = useState({
    approverId: financeData?.vpFinanceApproverId ?? "",
    statusId: financeData?.vpFinanceApprovalStatusId ?? "",
    approveById: financeData?.vpApprovedById ?? "",
    approveByName: financeData?.vpApprovedByName ?? "",
    approveDate: financeData?.vpApprovedDate ?? "",
  });
  const [savingVP, setSavingVP] = useState(false);
  const [vpSaved, setVPSaved] = useState(false);

  // ── Comments ──
  const [rcComments, setRcComments] = useState<CommentEntry[]>(initialRcComments);
  const [rcCommentText, setRcCommentText] = useState("");
  const [addingRcComment, setAddingRcComment] = useState(false);

  const [vpComments, setVpComments] = useState<CommentEntry[]>(initialVpComments);
  const [vpCommentText, setVpCommentText] = useState("");
  const [addingVpComment, setAddingVpComment] = useState(false);

  // ── EC & Related ──
  const [ecMembers, setEcMembers] = useState<EcMember[]>(initialEcMembers);
  const [ecSelectUser, setEcSelectUser] = useState("");
  const [addingEc, setAddingEc] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const [relatedCapex, setRelatedCapex] = useState<RelatedCapexItem[]>(
    initialRelatedCapex
  );
  const [newRelated, setNewRelated] = useState({ capExNo: "", description: "" });

  // ── CapEx ID ──
  const [projectCapex, setProjectCapex] = useState(
    financeData?.projectCapex ?? ""
  );
  const [generatingId, setGeneratingId] = useState(false);

  // ─── Derived state ────────────────────────────────────────────────────────

  const rcApproved = rc.statusId === "Approved";
  const vpApproved = vp.statusId === "Approved";
  const ecAllApproved =
    !requiresEC || (ecMembers.length > 0 && ecMembers.every((m) => m.status === "Approved"));
  const canGenerateId =
    rcApproved && vpApproved && ecAllApproved && !projectCapex && canEdit;

  const rcLocked = !!rc.approveById && !canEdit;
  const vpLocked = !!vp.approveById && !canEdit;
  const vpSectionEnabled = rcApproved;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleRCStatus(value: string) {
    const newStatus = value === "_none" ? "" : value;
    setRC((r) => ({
      ...r,
      statusId: newStatus,
      ...(newStatus === "Approved" && canEdit
        ? {
            approveById: currentUserId,
            approveByName: currentUserName,
            approveDate: new Date().toISOString(),
          }
        : {}),
    }));
    setRCSaved(false);
  }

  function handleVPStatus(value: string) {
    const newStatus = value === "_none" ? "" : value;
    setVP((v) => ({
      ...v,
      statusId: newStatus,
      ...(newStatus === "Approved" && canEdit
        ? {
            approveById: currentUserId,
            approveByName: currentUserName,
            approveDate: new Date().toISOString(),
          }
        : {}),
    }));
    setVPSaved(false);
  }

  async function saveBudget() {
    setSavingBudget(true);
    try {
      const res = await fetch(`/api/projects/${prjId}/capex/finance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBudget,
          explanation: explanation || null,
        }),
      });
      if (res.ok) setBudgetSaved(true);
    } finally {
      setSavingBudget(false);
    }
  }

  async function saveRC() {
    setSavingRC(true);
    try {
      const payload: Record<string, unknown> = {
        regCorpFinanceApproverId: rc.approverId || null,
        regionalApprovalStatusId: rc.statusId || null,
      };
      if (rc.approveById) {
        payload.regCorpApproveById = rc.approveById;
        payload.regCorpApproverDate = rc.approveDate;
      }
      const res = await fetch(`/api/projects/${prjId}/capex/finance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) setRCSaved(true);
    } finally {
      setSavingRC(false);
    }
  }

  async function saveVP() {
    setSavingVP(true);
    try {
      const payload: Record<string, unknown> = {
        vpFinanceApproverId: vp.approverId || null,
        vpFinanceApprovalStatusId: vp.statusId || null,
      };
      if (vp.approveById) {
        payload.vpApprovedById = vp.approveById;
        payload.vpApprovedDate = vp.approveDate;
      }
      const res = await fetch(`/api/projects/${prjId}/capex/finance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) setVPSaved(true);
    } finally {
      setSavingVP(false);
    }
  }

  async function addRcComment() {
    if (!rcCommentText.trim()) return;
    setAddingRcComment(true);
    try {
      const res = await fetch(`/api/projects/${prjId}/capex/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: rcCommentText.trim(),
          commentsType: "Regional_CorporateFinanceComments",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setRcComments((prev) => [
          {
            id: created.id,
            comments: created.comments,
            createdByName: currentUserName,
            createdOn: created.createdOn,
          },
          ...prev,
        ]);
        setRcCommentText("");
      }
    } finally {
      setAddingRcComment(false);
    }
  }

  async function addVpComment() {
    if (!vpCommentText.trim()) return;
    setAddingVpComment(true);
    try {
      const res = await fetch(`/api/projects/${prjId}/capex/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: vpCommentText.trim(),
          commentsType: "VPFinanceComments",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setVpComments((prev) => [
          {
            id: created.id,
            comments: created.comments,
            createdByName: currentUserName,
            createdOn: created.createdOn,
          },
          ...prev,
        ]);
        setVpCommentText("");
      }
    } finally {
      setAddingVpComment(false);
    }
  }

  async function addEcMember() {
    if (!ecSelectUser) return;
    setAddingEc(true);
    try {
      const res = await fetch(`/api/projects/${prjId}/capex/ec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: ecSelectUser }),
      });
      if (res.ok) {
        const member = await res.json();
        setEcMembers((m) => [
          {
            id: member.id,
            userId: member.userId,
            userName: member.user?.name ?? null,
            userEmail: member.user?.email ?? null,
            status: member.status,
            comments: member.comments ?? null,
            lastModifyDate: member.lastModifyDate ?? null,
          },
          ...m,
        ]);
        setEcSelectUser("");
      }
    } finally {
      setAddingEc(false);
    }
  }

  async function removeEcMember(id: string) {
    await fetch(`/api/projects/${prjId}/capex/ec?id=${id}`, {
      method: "DELETE",
    });
    setEcMembers((m) => m.filter((e) => e.id !== id));
  }

  async function sendEcEmail(id: string) {
    setSendingEmail(id);
    try {
      await fetch(`/api/projects/${prjId}/capex/ec`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, sendEmail: true }),
      });
    } finally {
      setSendingEmail(null);
    }
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
    await fetch(`/api/projects/${prjId}/capex/related?id=${id}`, {
      method: "DELETE",
    });
    setRelatedCapex((r) => r.filter((i) => i.id !== id));
  }

  async function generateCapexId() {
    setGeneratingId(true);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const generated = `Proj-CapExId_${rand}`;
    setProjectCapex(generated);
    await fetch(`/api/projects/${prjId}/capex/finance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectCapex: generated }),
    });
    setGeneratingId(false);
  }

  // ─── Grand total computed values ──────────────────────────────────────────
  const totalSeats = totals.itSeats + totals.facSeats + totals.secSeats;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <CapexFormHeader
        prjNumber={project.prjNumber}
        projectName={project.name}
        managerName={project.managerName}
        goLiveDate={project.goLiveDate}
        capexState={capexState}
      />

      {/* ── Client Information ── */}
      {clientInfo && (
        <CollapsibleCard title="Client Information">
          <div className="space-y-1">
            <ReadField
              label="Business Sponsor"
              value={clientInfo.businessSponsorName ?? ""}
            />
            <ReadField
              label="Business Requester"
              value={clientInfo.businessRequesterName ?? ""}
            />
            <ReadField
              label="Request Status"
              value={clientInfo.requestStatus ?? ""}
            />
            <ReadField
              label="Client Funded"
              value={
                clientInfo.isFunded === true
                  ? "Yes"
                  : clientInfo.isFunded === false
                  ? "No"
                  : ""
              }
            />
            <ReadField
              label="Client Mandated"
              value={
                clientInfo.isClientMandated === true
                  ? "Yes"
                  : clientInfo.isClientMandated === false
                  ? "No"
                  : ""
              }
            />
            {clientInfo.projectDescription && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-1">Project Description</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {clientInfo.projectDescription}
                </p>
              </div>
            )}
            {clientInfo.businessJustification && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-1">Business Justification</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {clientInfo.businessJustification}
                </p>
              </div>
            )}
          </div>
        </CollapsibleCard>
      )}

      {/* ── IT Summary ── */}
      {sectionSummary && bpm?.isIt && (
        <CollapsibleCard title="IT Summary">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">
                  Category
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Total ($)
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Seats/Hours
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Cost/Seat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                {
                  label: "Infrastructure",
                  total: sectionSummary.it.infrastructureCostTotal,
                  seats: sectionSummary.it.infrastructureCostSeats,
                },
                {
                  label: "EUS",
                  total: sectionSummary.it.eusCostTotal,
                  seats: sectionSummary.it.eusCostSeats,
                },
                {
                  label: "Capital Labor",
                  total: sectionSummary.it.capitalLaborCostTotal,
                  seats: sectionSummary.it.capitalLaborCostSeats,
                },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="px-3 py-2 text-gray-700">{row.label}</td>
                  <td className="px-3 py-2 text-right">{fmt(row.total)}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(row.seats)}</td>
                  <td className="px-3 py-2 text-right">
                    {cps(row.total, row.seats)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#0f1e35] text-white font-semibold">
                <td className="px-3 py-2.5">IT Total</td>
                <td className="px-3 py-2.5 text-right">{fmt(totals.it)}</td>
                <td className="px-3 py-2.5 text-right">
                  {fmtNum(totals.itSeats)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {cps(totals.it, totals.itSeats)}
                </td>
              </tr>
            </tbody>
          </table>
          {sectionSummary.it.itComments && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Document Summary</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {sectionSummary.it.itComments}
              </p>
            </div>
          )}
        </CollapsibleCard>
      )}

      {/* ── Facilities Summary ── */}
      {sectionSummary && bpm?.isFacilities && (
        <CollapsibleCard title="Facilities Summary">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">
                  Category
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Total ($)
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Seats/Hours
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Cost/Seat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                {
                  label: "Construction",
                  total: sectionSummary.facilities.construction,
                  seats: sectionSummary.facilities.constructionSeats,
                },
                {
                  label: "Electrical/Cabling",
                  total: sectionSummary.facilities.electricalCabling,
                  seats: sectionSummary.facilities.electricalCablingSeats,
                },
                {
                  label: "Furniture & Fixture",
                  total: sectionSummary.facilities.furnitureFixture,
                  seats: sectionSummary.facilities.furnitureFixtureSeats,
                },
                {
                  label: "Others",
                  total: sectionSummary.facilities.others,
                  seats: sectionSummary.facilities.othersSeats,
                },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="px-3 py-2 text-gray-700">{row.label}</td>
                  <td className="px-3 py-2 text-right">{fmt(row.total)}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(row.seats)}</td>
                  <td className="px-3 py-2 text-right">
                    {cps(row.total, row.seats)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-medium">
                <td className="px-3 py-2">Total Gross</td>
                <td className="px-3 py-2 text-right">
                  {fmt(sectionSummary.facilities.grossTotal)}
                </td>
                <td className="px-3 py-2 text-right">
                  {fmtNum(totals.facSeats)}
                </td>
                <td className="px-3 py-2 text-right">
                  {cps(sectionSummary.facilities.grossTotal, totals.facSeats)}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-600">
                  Tenant Improvement Allowance
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  {fmt(sectionSummary.facilities.tenantImprovementAllowance)}
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
              </tr>
              <tr className="bg-[#0f1e35] text-white font-semibold">
                <td className="px-3 py-2.5">Net of TIA</td>
                <td className="px-3 py-2.5 text-right">{fmt(totals.facilities)}</td>
                <td className="px-3 py-2.5 text-right">
                  {fmtNum(totals.facSeats)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {cps(totals.facilities, totals.facSeats)}
                </td>
              </tr>
            </tbody>
          </table>
        </CollapsibleCard>
      )}

      {/* ── Lease Information ── */}
      {sectionSummary && bpm?.isFacilities && (
        <CollapsibleCard title="Lease Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="space-y-1">
              <ReadField label="Region" value={sectionSummary.lease.leaseRegion ?? ""} />
              <ReadField
                label="Location"
                value={sectionSummary.lease.leaseLocation ?? ""}
              />
              <ReadField
                label="Details"
                value={sectionSummary.lease.leaseDetails ?? ""}
              />
              <ReadField
                label="Terms"
                value={sectionSummary.lease.leaseTerms ?? ""}
              />
            </div>
            <div className="space-y-1">
              <ReadField
                label="Terms & Conditions"
                value={sectionSummary.lease.leaseTermsConditions ?? ""}
              />
              <ReadField
                label="Total Lease Value"
                value={fmt(sectionSummary.lease.totalLeaseValue)}
              />
              <ReadField
                label="Current Year OpEx Impact"
                value={fmt(sectionSummary.lease.currentYearOpexImpact)}
              />
            </div>
          </div>
        </CollapsibleCard>
      )}

      {/* ── Security Summary ── */}
      {sectionSummary && bpm?.isPhysicalSecurity && (
        <CollapsibleCard title="Physical Security Summary">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">
                  Category
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Total ($)
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Seats/Hours
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">
                  Cost/Seat
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#0f1e35] text-white font-semibold">
                <td className="px-3 py-2.5">Physical Security</td>
                <td className="px-3 py-2.5 text-right">{fmt(totals.security)}</td>
                <td className="px-3 py-2.5 text-right">
                  {fmtNum(totals.secSeats)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {cps(totals.security, totals.secSeats)}
                </td>
              </tr>
            </tbody>
          </table>
        </CollapsibleCard>
      )}

      {/* ── Grand Total ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Grand Total</SectionTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                Category
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">
                Amount
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">
                Avg Seats/Hrs
              </th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">
                Cost/Seat
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bpm?.isIt && (
              <tr>
                <td className="px-3 py-2.5 text-gray-700">IT</td>
                <td className="px-3 py-2.5 text-right">{fmt(totals.it)}</td>
                <td className="px-3 py-2.5 text-right">{fmtNum(totals.itSeats)}</td>
                <td className="px-3 py-2.5 text-right">
                  {cps(totals.it, totals.itSeats)}
                </td>
              </tr>
            )}
            {bpm?.isFacilities && (
              <tr>
                <td className="px-3 py-2.5 text-gray-700">
                  Facilities (Net of TIA)
                </td>
                <td className="px-3 py-2.5 text-right">{fmt(totals.facilities)}</td>
                <td className="px-3 py-2.5 text-right">
                  {fmtNum(totals.facSeats)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {cps(totals.facilities, totals.facSeats)}
                </td>
              </tr>
            )}
            {bpm?.isPhysicalSecurity && (
              <tr>
                <td className="px-3 py-2.5 text-gray-700">Physical Security</td>
                <td className="px-3 py-2.5 text-right">{fmt(totals.security)}</td>
                <td className="px-3 py-2.5 text-right">{fmtNum(totals.secSeats)}</td>
                <td className="px-3 py-2.5 text-right">
                  {cps(totals.security, totals.secSeats)}
                </td>
              </tr>
            )}
            <tr className="bg-[#0f1e35] text-white font-semibold">
              <td className="px-3 py-3">Grand Total</td>
              <td className="px-3 py-3 text-right">{fmt(grandTotal)}</td>
              <td className="px-3 py-3 text-right">{fmtNum(totalSeats)}</td>
              <td className="px-3 py-3 text-right">
                {cps(grandTotal, totalSeats)}
              </td>
            </tr>
          </tbody>
        </table>
        {requiresEC && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 font-medium">
            <span>⚠</span>
            <span>
              Executive Committee approval required (Grand Total &gt; $25,000)
            </span>
          </div>
        )}
      </div>

      {/* ── Finance Review ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Finance Review</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              IS Budgeted?
            </Label>
            <div className="flex gap-6">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isBudget"
                    checked={isBudget === v}
                    onChange={() => {
                      setIsBudget(v);
                      setBudgetSaved(false);
                    }}
                    disabled={!canEdit}
                    className="h-4 w-4 text-[#0f1e35]"
                  />
                  <span className="text-sm">{v ? "Yes" : "No"}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Explanation
            </Label>
            <Textarea
              value={explanation}
              onChange={(e) => {
                setExplanation(e.target.value);
                setBudgetSaved(false);
              }}
              disabled={!canEdit}
              rows={2}
              placeholder="Budget explanation..."
            />
          </div>
        </div>
        {canEdit && (
          <div className="mt-4 flex items-center gap-3">
            {budgetSaved && (
              <span className="text-sm text-green-600">Saved</span>
            )}
            <Button
              size="sm"
              onClick={saveBudget}
              disabled={savingBudget || isBudget === null}
              className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
            >
              <Save className="h-3.5 w-3.5" />
              {savingBudget ? "Saving..." : "Save Budget Decision"}
            </Button>
          </div>
        )}
      </div>

      {/* ── RC Finance Approver ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <SectionTitle>Regional / Corporate Finance Approver</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Finance Approver
            </Label>
            <Select
              value={rc.approverId}
              onValueChange={(v) => {
                setRC((r) => ({ ...r, approverId: v === "_none" ? "" : v }));
                setRCSaved(false);
              }}
              disabled={!canEdit || rcLocked}
            >
              <SelectTrigger>
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Approval Status
            </Label>
            <Select
              value={rc.statusId || "_none"}
              onValueChange={handleRCStatus}
              disabled={!canEdit || rcLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {RC_VP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Approved By
            </Label>
            <Input
              value={rc.approveByName}
              readOnly
              className="bg-gray-50"
              placeholder="Auto-filled on approval"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Approval Date
            </Label>
            <Input
              value={rc.approveDate ? fmtDate(rc.approveDate) : ""}
              readOnly
              className="bg-gray-50"
              placeholder="Auto-filled on approval"
            />
          </div>
        </div>
        {rc.statusId && (
          <Badge variant={statusVariant(rc.statusId)}>
            RC Status: {rc.statusId}
          </Badge>
        )}

        {/* RC Comments */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Finance Comments
          </Label>
          {canEdit && (
            <div className="flex gap-2">
              <Textarea
                value={rcCommentText}
                onChange={(e) => setRcCommentText(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="flex-1 resize-none"
              />
              <Button
                size="sm"
                onClick={addRcComment}
                disabled={addingRcComment || !rcCommentText.trim()}
                className="self-end bg-[#0f1e35] hover:bg-[#1a2f4f]"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <CommentHistory comments={rcComments} />
        </div>

        {canEdit && (
          <div className="flex items-center gap-3 pt-1">
            {rcSaved && <span className="text-sm text-green-600">Updated</span>}
            <Button
              size="sm"
              onClick={saveRC}
              disabled={savingRC}
              className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
            >
              <Save className="h-3.5 w-3.5" />
              {savingRC ? "Saving..." : "Update RC Approver"}
            </Button>
          </div>
        )}
      </div>

      {/* ── VP Finance Approver ── */}
      <div
        className={`bg-white rounded-lg border border-gray-200 p-6 space-y-5 ${
          !vpSectionEnabled ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <SectionTitle>VP Finance Approver</SectionTitle>
          {!vpSectionEnabled && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Lock className="h-3.5 w-3.5" />
              Available after RC Finance approves
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              VP Finance Approver
            </Label>
            <Select
              value={vp.approverId}
              onValueChange={(v) => {
                setVP((r) => ({ ...r, approverId: v === "_none" ? "" : v }));
                setVPSaved(false);
              }}
              disabled={!canEdit || !vpSectionEnabled || vpLocked}
            >
              <SelectTrigger>
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Approval Status
            </Label>
            <Select
              value={vp.statusId || "_none"}
              onValueChange={handleVPStatus}
              disabled={!canEdit || !vpSectionEnabled || vpLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {RC_VP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Approved By
            </Label>
            <Input
              value={vp.approveByName}
              readOnly
              className="bg-gray-50"
              placeholder="Auto-filled on approval"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Approval Date
            </Label>
            <Input
              value={vp.approveDate ? fmtDate(vp.approveDate) : ""}
              readOnly
              className="bg-gray-50"
              placeholder="Auto-filled on approval"
            />
          </div>
        </div>
        {vp.statusId && (
          <Badge variant={statusVariant(vp.statusId)}>
            VP Status: {vp.statusId}
          </Badge>
        )}

        {/* VP Comments */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            VP Finance Comments
          </Label>
          {canEdit && vpSectionEnabled && (
            <div className="flex gap-2">
              <Textarea
                value={vpCommentText}
                onChange={(e) => setVpCommentText(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="flex-1 resize-none"
              />
              <Button
                size="sm"
                onClick={addVpComment}
                disabled={addingVpComment || !vpCommentText.trim()}
                className="self-end bg-[#0f1e35] hover:bg-[#1a2f4f]"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <CommentHistory comments={vpComments} />
        </div>

        {canEdit && vpSectionEnabled && (
          <div className="flex items-center gap-3 pt-1">
            {vpSaved && <span className="text-sm text-green-600">Updated</span>}
            <Button
              size="sm"
              onClick={saveVP}
              disabled={savingVP}
              className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
            >
              <Save className="h-3.5 w-3.5" />
              {savingVP ? "Saving..." : "Update VP Approver"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Executive Committee ── */}
      {requiresEC && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <SectionTitle>Executive Committee</SectionTitle>
          {canEdit && (
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-xs space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Add EC Member
                </Label>
                <Select value={ecSelectUser} onValueChange={setEcSelectUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={addEcMember}
                disabled={addingEc || !ecSelectUser}
                className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
              >
                <Plus className="h-3.5 w-3.5" />
                {addingEc ? "Adding..." : "Add & Send Email"}
              </Button>
            </div>
          )}
          {ecMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                      Email
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                      Comments
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                      Date
                    </th>
                    <th className="px-3 py-2.5 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ecMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">
                        {m.userName ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">
                        {m.userEmail ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={statusVariant(m.status)}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs max-w-[160px] truncate">
                        {m.comments ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-400 text-xs">
                        {fmtDate(m.lastModifyDate)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button
                              onClick={() => sendEcEmail(m.id)}
                              disabled={sendingEmail === m.id}
                              title="Resend email"
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              {sendingEmail === m.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => removeEcMember(m.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              No EC members added yet
            </p>
          )}
          {ecMembers.length > 0 && !ecAllApproved && (
            <p className="text-xs text-amber-600">
              ⏳ Waiting for all EC members to approve before CapEx ID can be
              generated.
            </p>
          )}
        </div>
      )}

      {/* ── CapEx ID ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Project CapEx Number</SectionTitle>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">CapEx ID</Label>
            <Input
              value={projectCapex}
              readOnly
              className="bg-gray-50 font-mono"
              placeholder="Not yet generated"
            />
          </div>
          {canGenerateId && (
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
          {!canGenerateId && !projectCapex && (
            <p className="text-xs text-gray-400 mb-2">
              {!rcApproved
                ? "Requires RC Finance approval"
                : !vpApproved
                ? "Requires VP Finance approval"
                : requiresEC && !ecAllApproved
                ? "Requires all EC approvals"
                : "No permission to generate"}
            </p>
          )}
        </div>
        {projectCapex && (
          <p className="mt-2 text-xs text-green-600 font-medium">
            ✓ CapEx ID generated: {projectCapex}
          </p>
        )}
      </div>

      {/* ── Related CapEx ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionTitle>Related CapEx Numbers</SectionTitle>
        {canEdit && (
          <div className="flex items-end gap-3 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">CapEx No.</Label>
              <Input
                value={newRelated.capExNo}
                onChange={(e) =>
                  setNewRelated((r) => ({ ...r, capExNo: e.target.value }))
                }
                placeholder="Proj-CapExId_XXXX"
                className="w-44"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-gray-600">Description</Label>
              <Input
                value={newRelated.description}
                onChange={(e) =>
                  setNewRelated((r) => ({ ...r, description: e.target.value }))
                }
                placeholder="Description..."
              />
            </div>
            <Button
              size="sm"
              onClick={addRelated}
              disabled={!newRelated.capExNo}
              className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        )}
        {relatedCapex.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                  CapEx No.
                </th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                  Description
                </th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                  Date Added
                </th>
                {canEdit && <th className="px-3 py-2.5 w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {relatedCapex.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-xs">
                    {r.capExNo ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {r.description ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs">
                    {new Date(r.createdDate).toLocaleDateString("en-US")}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-3">
                      <button
                        onClick={() => removeRelated(r.id)}
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
            No related CapEx numbers
          </p>
        )}
      </div>

      {/* ── Attachments ── */}
      {capexId && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SectionTitle>Finance Review Attachments</SectionTitle>
          <FileUploadZone
            capExRequestId={capexId}
            sectionId="FinanceReviewFileUpload"
            initialAttachments={initialAttachments}
            disabled={!canEdit}
          />
        </div>
      )}
    </div>
  );
}
