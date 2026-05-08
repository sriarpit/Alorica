const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f1e35;padding:24px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px;">Alorica</span>
          <span style="color:#94a3b8;font-size:13px;margin-left:12px;">Site Build</span>
        </td></tr>
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated message from the Alorica Site Build system. Do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, href: string, color = "#0f1e35"): string {
  return `<a href="${href}" style="display:inline-block;padding:10px 24px;background:${color};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">${label}</a>`;
}

function field(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#64748b;font-size:13px;width:160px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#1e293b;font-size:13px;vertical-align:top;font-weight:500;">${value || "—"}</td>
  </tr>`;
}

function sectionHeader(title: string): string {
  return `<tr><td colspan="2" style="padding:16px 0 6px;"><p style="margin:0;color:#0f1e35;font-size:13px;font-weight:700;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">${title}</p></td></tr>`;
}

function currency(n: number | null | undefined): string {
  if (!n) return "$0";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

// ─── 1. Project Request Created ───────────────────────────────────────────────
export interface ProjectCreatedParams {
  to: string;
  cc?: string;
  requesterName: string;
  projectNumber: string;
  projectName: string;
  requestDate: string;
  currentStatus: string;
  prjId: string;
}

export function projectCreatedEmail(p: ProjectCreatedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/request-details`;
  return {
    to: p.to,
    cc: p.cc,
    subject: `Project Request Initiated — ${p.projectNumber}`,
    html: wrap(
      `Project Request Initiated — ${p.projectNumber}`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Project Request Initiated</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.requesterName}, your project request has been successfully initiated in the Alorica Site Build system.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Request Date", p.requestDate)}
        ${field("Current Status", p.currentStatus)}
        ${field("Pending Action", "CapEx Request Details to be completed")}
      </table>
      <p style="margin:24px 0 0;">${btn("Open CapEx Form", url)}</p>`
    ),
  };
}

// ─── 2. Request Details Submitted ────────────────────────────────────────────
export interface RequestDetailsSubmittedParams {
  to: string | string[];
  cc?: string | string[];
  projectNumber: string;
  projectName: string;
  requesterName: string;
  region: string;
  country: string;
  goLiveDate?: string;
  prjId: string;
}

export function requestDetailsSubmittedEmail(p: RequestDetailsSubmittedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/types-bpm`;
  return {
    to: p.to,
    cc: p.cc,
    subject: `CapEx Request Details Submitted — ${p.projectNumber}`,
    html: wrap(
      `CapEx Request Details Submitted`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">CapEx Request Details Submitted</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">A CapEx request has been submitted and is pending CapEx Type &amp; BPM completion.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Submitted By", p.requesterName)}
        ${field("Region", p.region)}
        ${field("Country", p.country)}
        ${p.goLiveDate ? field("Go Live Date", p.goLiveDate) : ""}
      </table>
      <p style="margin:24px 0 0;">${btn("Complete CapEx Types & BPM", url)}</p>`
    ),
  };
}

// ─── 3. CapEx Type & BPM Submitted → Functional Leader ───────────────────────
export interface FunctionalAssignmentParams {
  to: string;
  recipientName: string;
  section: "IT" | "Facilities" | "Security";
  projectName: string;
  projectNumber: string;
  prjId: string;
}

export function functionalAssignmentEmail(p: FunctionalAssignmentParams) {
  const sectionPath: Record<string, string> = {
    IT: "functional/it",
    Facilities: "functional/facilities",
    Security: "functional/security",
  };
  const url = `${BASE_URL}/projects/${p.prjId}/capex/${sectionPath[p.section]}`;
  return {
    to: p.to,
    subject: `You have been assigned as ${p.section} PM — ${p.projectNumber}`,
    html: wrap(
      `${p.section} PM Assignment`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">${p.section} PM Assignment</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.recipientName}, you have been assigned as the <strong>${p.section} Project Manager</strong> for the following CapEx request.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Section", p.section)}
      </table>
      <p style="margin:24px 0 0;">${btn(`Open ${p.section} Form`, url)}</p>`
    ),
  };
}

// ─── 4/5/6. IT / Facilities / Security Summary Submitted → Lead Approvers ────
export interface LeadApproverNotificationParams {
  to: string | string[];
  cc?: string | string[];
  section: "IT" | "Facilities" | "Security";
  projectName: string;
  projectNumber: string;
  submittedBy: string;
  prjId: string;
  lineItems?: { label: string; amount: number }[];
}

export function leadApproverNotificationEmail(p: LeadApproverNotificationParams) {
  const sectionPath: Record<string, string> = {
    IT: "functional/it",
    Facilities: "functional/facilities",
    Security: "functional/security",
  };
  const url = `${BASE_URL}/projects/${p.prjId}/capex/${sectionPath[p.section]}`;
  const itemRows = (p.lineItems ?? [])
    .map(
      (item) =>
        `<tr>
          <td style="padding:5px 0;color:#475569;font-size:13px;">${item.label}</td>
          <td style="padding:5px 0;color:#1e293b;font-size:13px;font-weight:600;text-align:right;">${currency(item.amount)}</td>
        </tr>`
    )
    .join("");
  return {
    to: p.to,
    cc: p.cc,
    subject: `${p.section} Section Submitted for Your Approval — ${p.projectNumber}`,
    html: wrap(
      `${p.section} Approval Required`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">${p.section} Section Submitted for Approval</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">The ${p.section} section of the following CapEx request has been submitted and requires your approval.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Submitted By", p.submittedBy)}
      </table>
      ${
        itemRows
          ? `<p style="color:#64748b;font-size:13px;font-weight:600;margin:0 0 6px;">${p.section.toUpperCase()} COST BREAKDOWN</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;border-top:1px solid #e2e8f0;">
              ${itemRows}
            </table>`
          : ""
      }
      <p style="margin:24px 0 0;">${btn("Review & Approve", url)}</p>`
    ),
  };
}

// ─── 4/5/6. Leadership broadcast (all IT/Fac/Sec Leadership role users) ──────
export interface LeadershipApprovalParams {
  to: string | string[];
  section: "IT" | "Facilities" | "Security";
  projectName: string;
  projectNumber: string;
  submittedBy: string;
  prjId: string;
}

export function leadershipApprovalEmail(p: LeadershipApprovalParams) {
  const sectionPath: Record<string, string> = {
    IT: "functional/it",
    Facilities: "functional/facilities",
    Security: "functional/security",
  };
  const url = `${BASE_URL}/projects/${p.prjId}/capex/${sectionPath[p.section]}`;
  return {
    to: p.to,
    subject: `${p.section} Section Awaiting Your Approval — ${p.projectNumber}`,
    html: wrap(
      `${p.section} Approval Required`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">${p.section} Section Submitted for Approval</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">The ${p.section} section of the following CapEx request has been submitted and requires leadership approval.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Submitted By", p.submittedBy)}
        ${field("Section", p.section)}
      </table>
      <p style="margin:24px 0 0;">${btn("Review & Approve", url)}</p>`
    ),
  };
}

// ─── 7. All Sections Approved → Finance Team ─────────────────────────────────
export interface AllSectionsApprovedParams {
  to: string | string[];
  cc?: string | string[];
  projectName: string;
  projectNumber: string;
  prjId: string;
  approvedSections: string[];
  approvedBy: string;
  approvalDate: string;
}

export function allSectionsApprovedEmail(p: AllSectionsApprovedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/finance-review`;
  const sectionList = p.approvedSections
    .map((s) => `<li style="margin-bottom:4px;color:#1e293b;font-size:13px;">${s}</li>`)
    .join("");
  return {
    to: p.to,
    cc: p.cc,
    subject: `All Functional Approvals Complete — ${p.projectNumber} Ready for Finance Review`,
    html: wrap(
      "All Functional Approvals Complete",
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">All Sections Approved — Finance Review Required</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">All required functional sections for the following CapEx request have been approved by leadership. The request is now ready for finance review.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Approved By", p.approvedBy)}
        ${field("Approval Date", p.approvalDate)}
      </table>
      <p style="color:#64748b;font-size:13px;margin:0 0 6px;font-weight:600;">APPROVED SECTIONS</p>
      <ul style="margin:0 0 20px;padding-left:20px;">${sectionList}</ul>
      <p style="margin:24px 0 0;">${btn("Open Finance Review", url)}</p>`
    ),
  };
}

// ─── 8/9. RC / VP Finance Approver Assigned ──────────────────────────────────
export interface FinanceApproverAssignedParams {
  to: string;
  cc?: string | string[];
  approverName: string;
  role: "RC Finance Approver" | "VP Finance Approver";
  projectName: string;
  projectNumber: string;
  prjId: string;
}

export function financeApproverAssignedEmail(p: FinanceApproverAssignedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/finance-review`;
  return {
    to: p.to,
    cc: p.cc,
    subject: `Finance Review Assigned — ${p.projectNumber}`,
    html: wrap(
      `Finance Review Assignment`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Finance Review Assigned</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.approverName}, you have been assigned as the <strong>${p.role}</strong> for the following CapEx request. Your review and approval is required.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Your Role", p.role)}
      </table>
      <p style="margin:24px 0 0;">${btn("Open Finance Review", url)}</p>`
    ),
  };
}

// ─── 10. EC Member Assigned ───────────────────────────────────────────────────
export interface SectionSummary {
  total: number;
  seats?: number;
  breakdown?: { label: string; amount: number }[];
}

export interface EcAssignedParams {
  to: string;
  cc?: string | string[];
  memberName: string;
  projectName: string;
  projectNumber: string;
  projectManager: string;
  region?: string;
  country?: string;
  location?: string;
  grandTotal: number;
  token: string;
  itSummary?: SectionSummary | null;
  facilitiesSummary?: SectionSummary | null;
  securitySummary?: SectionSummary | null;
  leaseInfo?: { region?: string; location?: string; details?: string } | null;
  relatedCapexIds?: string[];
}

export function ecAssignedEmail(p: EcAssignedParams) {
  const ecUrl = `${BASE_URL}/ec/${p.token}`;
  const totalFormatted = currency(p.grandTotal);

  function summaryRows(label: string, s: SectionSummary | null | undefined): string {
    if (!s || !s.total) return "";
    const breakdownRows = (s.breakdown ?? [])
      .map(
        (item) =>
          `<tr>
            <td style="padding:3px 0 3px 12px;color:#64748b;font-size:12px;">${item.label}</td>
            <td style="padding:3px 0;color:#475569;font-size:12px;text-align:right;">${currency(item.amount)}</td>
          </tr>`
      )
      .join("");
    return `<tr style="background:#f8fafc;">
      <td style="padding:6px 8px;color:#0f1e35;font-size:13px;font-weight:700;">${label}</td>
      <td style="padding:6px 8px;color:#0f1e35;font-size:13px;font-weight:700;text-align:right;">${currency(s.total)}</td>
    </tr>${breakdownRows}`;
  }

  const hasSummaries = p.itSummary || p.facilitiesSummary || p.securitySummary;

  return {
    to: p.to,
    cc: p.cc,
    subject: `Approved Request – CapEx Form – ${p.projectName}`,
    html: wrap(
      `EC Approval Required — ${p.projectNumber}`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Executive Committee Approval Required</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.memberName}, you have been selected as an Executive Committee member for the following CapEx request. Your approval is required.</p>

      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${sectionHeader("Project Details")}
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Project Manager", p.projectManager)}
        ${p.region ? field("Region", p.region) : ""}
        ${p.country ? field("Country", p.country) : ""}
        ${p.location ? field("Location", p.location) : ""}
      </table>

      ${hasSummaries ? `
      <p style="color:#64748b;font-size:13px;font-weight:600;margin:0 0 6px;">COST SUMMARY</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:20px;">
        ${summaryRows("IT", p.itSummary)}
        ${summaryRows("Facilities", p.facilitiesSummary)}
        ${summaryRows("Physical Security", p.securitySummary)}
        <tr style="background:#0f1e35;">
          <td style="padding:8px;color:#ffffff;font-size:14px;font-weight:700;">Grand Total</td>
          <td style="padding:8px;color:#ffffff;font-size:14px;font-weight:700;text-align:right;">${totalFormatted}</td>
        </tr>
      </table>` : `
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        ${field("Grand Total", totalFormatted)}
      </table>`}

      ${p.leaseInfo ? `
      <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;">
        ${sectionHeader("Lease Information")}
        ${p.leaseInfo.region ? field("Lease Region", p.leaseInfo.region) : ""}
        ${p.leaseInfo.location ? field("Lease Location", p.leaseInfo.location) : ""}
        ${p.leaseInfo.details ? field("Lease Details", p.leaseInfo.details) : ""}
      </table>` : ""}

      ${p.relatedCapexIds?.length ? `
      <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;">
        ${sectionHeader("Related CapEx IDs")}
        ${p.relatedCapexIds.map((id) => field("CapEx ID", id)).join("")}
      </table>` : ""}

      <p style="color:#475569;font-size:13px;margin-bottom:20px;">Please review the full CapEx request and submit your decision.</p>
      <p style="margin:0;display:flex;gap:12px;">
        ${btn("Approve", ecUrl, "#16a34a")}
        &nbsp;&nbsp;
        ${btn("Reject", ecUrl, "#dc2626")}
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;">This link is unique to you and will open the EC approval screen where you can add comments and record your decision. Do not share it.</p>`
    ),
  };
}

// ─── 10b. All EC Members Approved → PM ───────────────────────────────────────
export interface EcAllApprovedParams {
  to: string;
  pmName: string;
  projectName: string;
  projectNumber: string;
  prjId: string;
}

export function ecAllApprovedEmail(p: EcAllApprovedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/finance-review`;
  return {
    to: p.to,
    subject: `EC Approval Complete — ${p.projectNumber}`,
    html: wrap(
      `EC Approval Complete`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Executive Committee Fully Approved</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.pmName}, all Executive Committee members have approved the CapEx request for project <strong>${p.projectNumber}</strong>. The request can now proceed to CapEx ID generation.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
      </table>
      <p style="margin:24px 0 0;">${btn("View Finance Review", url)}</p>`
    ),
  };
}

// ─── 11. CapEx ID Generated ───────────────────────────────────────────────────
export interface CapexIdGeneratedParams {
  to: string | string[];
  cc?: string | string[];
  capexId: string;
  projectName: string;
  projectNumber: string;
  prjId: string;
  generatedDate?: string;
  relatedCapexIds?: string[];
}

export function capexIdGeneratedEmail(p: CapexIdGeneratedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/finance-review`;
  return {
    to: p.to,
    cc: p.cc,
    subject: `CapEx ID Generated — ${p.projectNumber}`,
    html: wrap(
      `CapEx ID Generated`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">CapEx ID Has Been Generated</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">A CapEx ID has been successfully generated for the following project. Milestone assignments have been initiated.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("CapEx ID", p.capexId)}
        ${p.generatedDate ? field("Generated Date", p.generatedDate) : ""}
        ${(p.relatedCapexIds ?? []).map((id) => field("Related CapEx ID", id)).join("")}
      </table>
      <p style="margin:24px 0 0;">${btn("View Finance Review", url)}</p>`
    ),
  };
}

// ─── 12/13. Milestone Owner Assigned ─────────────────────────────────────────
export interface MilestoneAssignedParams {
  to: string;
  cc?: string | string[];
  assigneeName: string;
  milestoneLabel: string;
  projectName: string;
  projectNumber: string;
  prjId: string;
  phaseNumber: number;
  phaseName?: string;
  assignedDate?: string;
  dueDate?: string;
  plannedEndDate?: string;
}

export function milestoneAssignedEmail(p: MilestoneAssignedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/milestones/phase-${p.phaseNumber}`;
  return {
    to: p.to,
    cc: p.cc,
    subject: `Milestone Assigned to You — ${p.projectNumber}`,
    html: wrap(
      `Milestone Assigned`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Milestone Assigned</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.assigneeName}, a milestone has been assigned to you on project <strong>${p.projectNumber}</strong>. Please review the details and update the status when work begins.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Milestone", p.milestoneLabel)}
        ${p.phaseName ? field("Phase", p.phaseName) : ""}
        ${p.assignedDate ? field("Assigned Date", p.assignedDate) : ""}
        ${p.dueDate ? field("SLA Due Date", p.dueDate) : ""}
        ${p.plannedEndDate ? field("Planned End Date", p.plannedEndDate) : ""}
      </table>
      <p style="color:#64748b;font-size:13px;margin-bottom:16px;"><strong>Pending Tasks:</strong> Review milestone requirements, update status to In Progress when work begins, and mark as Completed when done.</p>
      <p style="margin:0;">${btn("View Milestone", url)}</p>`
    ),
  };
}

// ─── Finance Notification (kept for backward compat) ─────────────────────────
export interface FinanceNotificationParams {
  to: string | string[];
  projectName: string;
  projectNumber: string;
  prjId: string;
  isBudget: boolean;
  explanation?: string;
}

export function financeNotificationEmail(p: FinanceNotificationParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/finance-review`;
  return {
    to: p.to,
    subject: `Finance Review Required — ${p.projectNumber}`,
    html: wrap(
      `Finance Review Required`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Finance Review Required</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">A CapEx request has been escalated to finance for review and approval.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Budget Available", p.isBudget ? "Yes" : "No")}
        ${p.explanation ? field("Explanation", p.explanation) : ""}
      </table>
      <p style="margin:24px 0 0;">${btn("Open Finance Review", url)}</p>`
    ),
  };
}

// ─── New User Created ─────────────────────────────────────────────────────────
export interface NewUserParams {
  to: string;
  name: string;
  username: string;
}

export function newUserEmail(p: NewUserParams) {
  const loginUrl = `${BASE_URL}/login`;
  return {
    to: p.to,
    subject: "Welcome to Alorica Site Build",
    html: wrap(
      "Welcome to Alorica Site Build",
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Welcome, ${p.name}!</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Your account has been created for the Alorica Site Build system. Use the credentials below to log in.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;">
        ${field("Username", p.username)}
        ${field("Password", "Welcome@123 (change on first login)")}
        ${field("Login URL", loginUrl)}
      </table>
      <p style="margin:24px 0 0;">${btn("Log In Now", loginUrl)}</p>`
    ),
  };
}

// ─── SLA Overdue Reminder ─────────────────────────────────────────────────────
export interface SlaReminderParams {
  to: string;
  assigneeName: string;
  milestoneLabel: string;
  projectName: string;
  projectNumber: string;
  prjId: string;
  phaseNumber: number;
  dueDate: string;
  daysOverdue: number;
}

export function slaReminderEmail(p: SlaReminderParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/milestones/phase-${p.phaseNumber}`;
  return {
    to: p.to,
    subject: `OVERDUE: Milestone Past Due — ${p.projectNumber}`,
    html: wrap(
      `Overdue Milestone — ${p.projectNumber}`,
      `<h2 style="margin:0 0 8px;color:#dc2626;font-size:20px;">&#9888; Milestone Overdue</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.assigneeName}, the following milestone is <strong style="color:#dc2626;">${p.daysOverdue} day${p.daysOverdue === 1 ? "" : "s"} overdue</strong>.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;border:1px solid #fca5a5;border-radius:6px;overflow:hidden;">
        <tr><td style="background:#fee2e2;padding:8px 16px;" colspan="2"><span style="color:#dc2626;font-weight:600;font-size:13px;">Overdue Milestone</span></td></tr>
        <tr><td style="padding:12px 16px;">
          <table cellpadding="0" cellspacing="0" style="width:100%;">
            ${field("Project Number", p.projectNumber)}
            ${field("Project Name", p.projectName)}
            ${field("Milestone", p.milestoneLabel)}
            ${field("Due Date", p.dueDate)}
            ${field("Days Overdue", String(p.daysOverdue))}
          </table>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;">${btn("Update Milestone", url, "#dc2626")}</p>`
    ),
  };
}

// ─── CapEx Form Submitted (kept for backward compat alias) ───────────────────
export interface CapexSubmittedParams {
  to: string;
  businessPmName: string;
  projectName: string;
  projectNumber: string;
  requesterName: string;
  prjId: string;
}

export function capexSubmittedEmail(p: CapexSubmittedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/types-bpm`;
  return {
    to: p.to,
    subject: `CapEx Form Initiated — ${p.projectNumber}`,
    html: wrap(
      `CapEx Form Initiated — ${p.projectNumber}`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">CapEx Form Initiated</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.businessPmName}, a CapEx request has been submitted and requires your action to assign functional PMs.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Submitted By", p.requesterName)}
      </table>
      <p style="margin:24px 0 0;">${btn("Open CapEx Form", url)}</p>`
    ),
  };
}
