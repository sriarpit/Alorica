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
        <!-- Header -->
        <tr><td style="background:#0f1e35;padding:24px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px;">Alorica</span>
          <span style="color:#94a3b8;font-size:13px;margin-left:12px;">Site Build</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
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
    <td style="padding:6px 0;color:#1e293b;font-size:13px;vertical-align:top;font-weight:500;">${value}</td>
  </tr>`;
}

// ── New User Created ──────────────────────────────────────────────────────────
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
        ${field("Login URL", loginUrl)}
      </table>
      <p style="margin:24px 0 0;">${btn("Log In Now", loginUrl)}</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;">If you have questions, contact your system administrator.</p>`
    ),
  };
}

// ── CapEx Form Submitted (to Business PM) ────────────────────────────────────
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

// ── Functional PM Assignment ──────────────────────────────────────────────────
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

// ── Leadership Approval Needed ────────────────────────────────────────────────
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

// ── Finance Notification ──────────────────────────────────────────────────────
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

// ── EC Member Assigned ────────────────────────────────────────────────────────
export interface EcAssignedParams {
  to: string;
  memberName: string;
  projectName: string;
  projectNumber: string;
  projectManager: string;
  grandTotal: number;
  token: string;
}

export function ecAssignedEmail(p: EcAssignedParams) {
  const ecUrl = `${BASE_URL}/ec/${p.token}`;
  const totalFormatted = p.grandTotal.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });
  return {
    to: p.to,
    subject: `Executive Committee Approval Required — ${p.projectNumber}`,
    html: wrap(
      `EC Approval Required — ${p.projectNumber}`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Executive Committee Approval Required</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.memberName}, you have been selected as an Executive Committee member for the following CapEx request. Your approval is required.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Project Manager", p.projectManager)}
        ${field("Grand Total", totalFormatted)}
      </table>
      <p style="color:#475569;font-size:13px;margin-bottom:20px;">Click the button below to review the full project details and submit your decision.</p>
      <p style="margin:0;">${btn("Review & Decide", ecUrl)}</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;">This link is unique to you. Do not share it.</p>`
    ),
  };
}

// ── All EC Members Approved ───────────────────────────────────────────────────
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

// ── CapEx ID Generated ────────────────────────────────────────────────────────
export interface CapexIdGeneratedParams {
  to: string | string[];
  capexId: string;
  projectName: string;
  projectNumber: string;
  prjId: string;
}

export function capexIdGeneratedEmail(p: CapexIdGeneratedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/capex/finance-review`;
  return {
    to: p.to,
    subject: `CapEx ID Generated — ${p.projectNumber}`,
    html: wrap(
      `CapEx ID Generated`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">CapEx ID Has Been Generated</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">A CapEx ID has been successfully generated for the following project.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("CapEx ID", p.capexId)}
      </table>
      <p style="margin:24px 0 0;">${btn("View Finance Review", url)}</p>`
    ),
  };
}

// ── Milestone Assigned ────────────────────────────────────────────────────────
export interface MilestoneAssignedParams {
  to: string;
  assigneeName: string;
  milestoneLabel: string;
  projectName: string;
  projectNumber: string;
  prjId: string;
  phaseNumber: number;
  dueDate?: string;
}

export function milestoneAssignedEmail(p: MilestoneAssignedParams) {
  const url = `${BASE_URL}/projects/${p.prjId}/milestones/phase-${p.phaseNumber}`;
  return {
    to: p.to,
    subject: `Milestone Assigned to You — ${p.projectNumber}`,
    html: wrap(
      `Milestone Assigned`,
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Milestone Assigned</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.assigneeName}, a milestone has been assigned to you on project <strong>${p.projectNumber}</strong>.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
        ${field("Project Number", p.projectNumber)}
        ${field("Project Name", p.projectName)}
        ${field("Milestone", p.milestoneLabel)}
        ${p.dueDate ? field("Due Date", p.dueDate) : ""}
      </table>
      <p style="margin:24px 0 0;">${btn("View Milestone", url)}</p>`
    ),
  };
}

// ── SLA Overdue Reminder ──────────────────────────────────────────────────────
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
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${p.assigneeName}, the following milestone is <strong style="color:#dc2626;">${p.daysOverdue} day${p.daysOverdue === 1 ? "" : "s"} overdue</strong> and has been marked <span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">Delayed</span>.</p>
      <table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;border:1px solid #fca5a5;border-radius:6px;overflow:hidden;">
        <tr><td style="background:#fee2e2;padding:8px 16px;" colspan="2"><span style="color:#dc2626;font-weight:600;font-size:13px;">Overdue Milestone</span></td></tr>
        <tr><td style="padding:8px 16px;">${field("Project Number", p.projectNumber)}${field("Project Name", p.projectName)}${field("Milestone", p.milestoneLabel)}${field("Due Date", p.dueDate)}${field("Days Overdue", String(p.daysOverdue))}</td></tr>
      </table>
      <p style="margin:24px 0 0;">${btn("Update Milestone", url, "#dc2626")}</p>`
    ),
  };
}
