import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";

function authGuard(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// ─── Minimal HTML helpers ─────────────────────────────────────────────────────
function wrap(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:#0f1e35;padding:24px 32px;"><span style="color:#fff;font-size:22px;font-weight:bold;">Alorica</span><span style="color:#94a3b8;font-size:13px;margin-left:12px;">Site Build</span></td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;">Automated message from Alorica Site Build. Do not reply.</p></td></tr>
</table></td></tr></table></body></html>`;
}
function btn(label: string, href: string, color = "#0f1e35"): string {
  return `<a href="${href}" style="display:inline-block;padding:10px 24px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">${label}</a>`;
}
function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:180px;">${label}</td><td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${value || "—"}</td></tr>`;
}
function table(rows: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">${rows}</table>`;
}

// ─── Shared pending approval email ───────────────────────────────────────────
function buildPendingApprovalEmail(opts: {
  to: string;
  approverName: string;
  role: string;
  projectNumber: string;
  projectName: string;
  section: string;
  pendingSince: string;
  actionUrl: string;
}) {
  return {
    to: opts.to,
    subject: `Reminder: Pending Approval — ${opts.projectNumber}`,
    html: wrap(
      "Pending Approval Reminder",
      `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Approval Reminder</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${opts.approverName}, your approval is still pending for the following CapEx request.</p>
      ${table(
        row("Project Number", opts.projectNumber) +
        row("Project Name", opts.projectName) +
        row("Your Role", opts.role) +
        row("Section", opts.section) +
        row("Pending Since", opts.pendingSince)
      )}
      <p style="margin:24px 0 0;">${btn("Review & Approve", opts.actionUrl)}</p>`
    ),
  };
}

export async function GET(req: NextRequest) {
  if (!authGuard(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailsSent: string[] = [];

  // ── 1. RC Finance Approver pending ─────────────────────────────────────────
  const rcPending = await db.capexFinanceApproval.findMany({
    where: { regCorpFinanceApproverId: { not: null }, regionalApprovalStatusId: null },
    include: {
      capexRequest: { include: { project: { select: { id: true, name: true, prjNumber: true } } } },
      rcFinanceApprover: { select: { name: true, email: true } },
    },
  });

  for (const rec of rcPending) {
    const approver = rec.rcFinanceApprover;
    const project = rec.capexRequest.project;
    if (!approver?.email || !project) continue;
    sendEmail(
      buildPendingApprovalEmail({
        to: approver.email,
        approverName: approver.name,
        role: "RC Finance Approver",
        projectNumber: project.prjNumber,
        projectName: project.name,
        section: "Finance Review",
        pendingSince: rec.capexRequest.createdOn.toLocaleDateString("en-US"),
        actionUrl: `${BASE_URL}/projects/${project.id}/capex/finance-review`,
      })
    ).catch(() => {});
    emailsSent.push(`RC Finance — ${project.prjNumber} → ${approver.email}`);
  }

  // ── 2. VP Finance Approver pending ─────────────────────────────────────────
  const vpPending = await db.capexFinanceApproval.findMany({
    where: { vpFinanceApproverId: { not: null }, vpFinanceApprovalStatusId: null },
    include: {
      capexRequest: { include: { project: { select: { id: true, name: true, prjNumber: true } } } },
      vpFinanceApprover: { select: { name: true, email: true } },
    },
  });

  for (const rec of vpPending) {
    const approver = rec.vpFinanceApprover;
    const project = rec.capexRequest.project;
    if (!approver?.email || !project) continue;
    sendEmail(
      buildPendingApprovalEmail({
        to: approver.email,
        approverName: approver.name,
        role: "VP Finance Approver",
        projectNumber: project.prjNumber,
        projectName: project.name,
        section: "Finance Review",
        pendingSince: rec.capexRequest.createdOn.toLocaleDateString("en-US"),
        actionUrl: `${BASE_URL}/projects/${project.id}/capex/finance-review`,
      })
    ).catch(() => {});
    emailsSent.push(`VP Finance — ${project.prjNumber} → ${approver.email}`);
  }

  // ── 3. EC Members pending ───────────────────────────────────────────────────
  const ecPending = await db.executiveCommitteeMember.findMany({
    where: { status: Status.Pending, userId: { not: null } },
    include: {
      capexRequest: { include: { project: { select: { id: true, name: true, prjNumber: true } } } },
      user: { select: { name: true, email: true } },
    },
  });

  for (const ec of ecPending) {
    const member = ec.user;
    const project = ec.capexRequest.project;
    if (!member?.email || !project) continue;
    const ecUrl = `${BASE_URL}/ec/${ec.token}`;
    sendEmail({
      to: member.email,
      subject: `Reminder: EC Approval Pending — ${project.prjNumber}`,
      html: wrap(
        "EC Approval Reminder",
        `<h2 style="margin:0 0 8px;color:#0f1e35;font-size:20px;">Executive Committee Approval Reminder</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi ${member.name}, your Executive Committee approval is still pending for the following CapEx request.</p>
        ${table(row("Project Number", project.prjNumber) + row("Project Name", project.name))}
        <p style="margin:0;">${btn("Review & Decide", ecUrl)}</p>`
      ),
    }).catch(() => {});
    emailsSent.push(`EC — ${project.prjNumber} → ${member.email}`);
  }

  // ── 4. Functional section lead approvals pending ────────────────────────────
  const sectionsPending = await db.capexSectionDetails.findMany({
    where: {
      OR: [
        { infrastructureLeadApproverId: { not: null }, infrastructureLeadStatus: null },
        { eusLeadApproverId: { not: null }, eusStatus: null },
        { capitalLaborLeadApproverId: { not: null }, capitalLaborLeadStatus: null },
        { facilitiesLeadApproverId: { not: null }, facilitiesStatus: null },
        { securityLeadApproverId: { not: null }, securityLeadApproveStatus: null },
      ],
    },
    include: {
      capexRequest: { include: { project: { select: { id: true, name: true, prjNumber: true } } } },
      infraLeadApprover: { select: { name: true, email: true } },
      eusLeadApprover: { select: { name: true, email: true } },
      capLaborLeadApprover: { select: { name: true, email: true } },
      facilitiesLeadApprover: { select: { name: true, email: true } },
      securityLeadApprover: { select: { name: true, email: true } },
    },
  });

  for (const sec of sectionsPending) {
    const project = sec.capexRequest.project;
    if (!project) continue;

    const checks: { user: { name: string; email: string } | null; section: string; path: string }[] = [
      { user: sec.infrastructureLeadStatus ? null : sec.infraLeadApprover, section: "IT – Infrastructure", path: "functional/it" },
      { user: sec.eusStatus ? null : sec.eusLeadApprover, section: "IT – EUS", path: "functional/it" },
      { user: sec.capitalLaborLeadStatus ? null : sec.capLaborLeadApprover, section: "IT – Capital Labor", path: "functional/it" },
      { user: sec.facilitiesStatus ? null : sec.facilitiesLeadApprover, section: "Facilities", path: "functional/facilities" },
      { user: sec.securityLeadApproveStatus ? null : sec.securityLeadApprover, section: "Security", path: "functional/security" },
    ];

    for (const { user, section, path } of checks) {
      if (!user?.email) continue;
      sendEmail(
        buildPendingApprovalEmail({
          to: user.email,
          approverName: user.name,
          role: "Functional Lead Approver",
          projectNumber: project.prjNumber,
          projectName: project.name,
          section,
          pendingSince: sec.capexRequest.createdOn.toLocaleDateString("en-US"),
          actionUrl: `${BASE_URL}/projects/${project.id}/capex/${path}`,
        })
      ).catch(() => {});
      emailsSent.push(`Functional (${section}) — ${project.prjNumber} → ${user.email}`);
    }
  }

  return Response.json({
    emailsSent: emailsSent.length,
    emails: emailsSent,
    timestamp: new Date().toISOString(),
  });
}
