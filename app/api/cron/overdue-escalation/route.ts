import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { escalationEmail } from "@/lib/email/templates";
import { randomUUID } from "crypto";

function authGuard(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Escalation triggers: days overdue
const ESCALATION_DAYS = [1, 3, 5];

const PHASE_NAMES: Record<number, string> = {
  1: "Phase 1 – Initiation",
  2: "Phase 2 – Planning & Approval",
  3: "Phase 3 – Design & Order",
  4: "Phase 4 – Implementation / Build-Out",
  5: "Phase 5 – Site Ready",
};

async function wasEscalationSent(trackingId: string, stage: string): Promise<boolean> {
  try {
    const rows = await db.$queryRaw<{ stage: string }[]>`
      SELECT stage FROM sla_notification_log
      WHERE tracking_id = ${trackingId} AND stage = ${stage}
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function logEscalation(trackingId: string, stage: string): Promise<void> {
  try {
    await db.$executeRaw`
      INSERT INTO sla_notification_log (id, tracking_id, stage, sent_at)
      VALUES (${randomUUID()}, ${trackingId}, ${stage}, NOW())
      ON CONFLICT (tracking_id, stage) DO NOTHING
    `;
  } catch {
    // Migration pending — skip
  }
}

export async function GET(req: NextRequest) {
  if (!authGuard(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // All milestones that are delayed / still active and have a dueDate
  const overdueMilestones = await db.milestoneActivitiesTracking.findMany({
    where: {
      isActive: true,
      status: { not: Status.Completed },
      dueDate: { lt: today },
    },
    include: {
      milestoneActivity: { select: { label: true, phaseNumber: true } },
      assignee: { select: { id: true, name: true, email: true } },
      capexRequest: {
        include: {
          project: { select: { id: true, name: true, prjNumber: true } },
          businessPm: { select: { itPmId: true, facilitiesPmId: true, physicalSecurityPmId: true } },
        },
      },
    },
  });

  // Escalation recipients (fetched once)
  const escalationUsers = await db.user.findMany({
    where: {
      isActive: true,
      userRoles: {
        some: {
          role: {
            name: {
              in: [
                "Governance Manager",
                "IT Leadership",
                "Facilities Leadership",
                "Security Leadership",
              ],
            },
          },
        },
      },
    },
    select: { email: true },
  });
  const escalationEmails = escalationUsers.map((u) => u.email);

  const emailsSent: string[] = [];

  for (const m of overdueMilestones) {
    if (!m.dueDate || !m.capexRequest.project) continue;

    const due = new Date(m.dueDate);
    due.setHours(0, 0, 0, 0);
    const daysOverdue = Math.round((today.getTime() - due.getTime()) / 86_400_000);

    // Only fire at configured day thresholds
    if (!ESCALATION_DAYS.includes(daysOverdue)) continue;

    const escalationStage = `escalation_${daysOverdue}`;
    const alreadySent = await wasEscalationSent(m.id, escalationStage);
    if (alreadySent) continue;

    const project = m.capexRequest.project;
    const phaseNumber = m.milestoneActivity?.phaseNumber ?? 2;
    const phaseName = PHASE_NAMES[phaseNumber] ?? `Phase ${phaseNumber}`;

    // Build recipient set: escalation leaders + Business PMs
    const toSet = new Set<string>(escalationEmails);
    const bpm = m.capexRequest.businessPm;
    if (bpm) {
      const pmIds = [bpm.itPmId, bpm.facilitiesPmId, bpm.physicalSecurityPmId].filter(Boolean) as string[];
      if (pmIds.length > 0) {
        const pmUsers = await db.user.findMany({
          where: { id: { in: pmIds }, isActive: true },
          select: { email: true },
        });
        pmUsers.forEach((u) => toSet.add(u.email));
      }
    }

    const ccEmails = m.assignee?.email ? [m.assignee.email] : [];

    sendEmail(
      escalationEmail({
        to: Array.from(toSet),
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        milestoneLabel: m.milestoneActivity?.label ?? "Milestone",
        phaseName,
        projectName: project.name,
        projectNumber: project.prjNumber,
        prjId: project.id,
        phaseNumber,
        assigneeName: m.assignee?.name ?? "Unassigned",
        assignedDate: m.startDate ? new Date(m.startDate).toLocaleDateString("en-US") : "—",
        plannedEndDate: (m.plannedEndDate ?? m.dueDate)!.toLocaleDateString("en-US"),
        daysOverdue,
        currentStatus: m.status,
      })
    ).catch(() => {});

    await logEscalation(m.id, escalationStage);

    emailsSent.push(
      `escalation_${daysOverdue} — ${project.prjNumber} — ${m.milestoneActivity?.label ?? "?"}`
    );
  }

  return Response.json({
    evaluated: overdueMilestones.length,
    emailsSent: emailsSent.length,
    emails: emailsSent,
    timestamp: new Date().toISOString(),
  });
}
