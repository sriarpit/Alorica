import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { slaStageReminderEmail } from "@/lib/email/templates";
import { getSLAStage, calculateSLAPercentage, getRemainingDays } from "@/lib/sla";
import { randomUUID } from "crypto";

function authGuard(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const PHASE_NAMES: Record<number, string> = {
  1: "Phase 1 – Initiation",
  2: "Phase 2 – Planning & Approval",
  3: "Phase 3 – Design & Order",
  4: "Phase 4 – Implementation / Build-Out",
  5: "Phase 5 – Site Ready",
};

/** Returns stages already sent for a tracking record (raw SQL — table may not exist yet). */
async function getSentStages(trackingId: string): Promise<Set<string>> {
  try {
    const rows = await db.$queryRaw<{ stage: string }[]>`
      SELECT stage FROM sla_notification_log WHERE tracking_id = ${trackingId}
    `;
    return new Set(rows.map((r) => r.stage));
  } catch {
    return new Set();
  }
}

/** Logs a sent SLA notification (upsert — raw SQL). */
async function logSentStage(trackingId: string, stage: string): Promise<void> {
  try {
    await db.$executeRaw`
      INSERT INTO sla_notification_log (id, tracking_id, stage, sent_at)
      VALUES (${randomUUID()}, ${trackingId}, ${stage}, NOW())
      ON CONFLICT (tracking_id, stage) DO NOTHING
    `;
  } catch {
    // Table not yet created — skip logging (migration pending)
  }
}

export async function GET(req: NextRequest) {
  if (!authGuard(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // All active non-completed milestones that have enough data to evaluate
  const milestones = await db.milestoneActivitiesTracking.findMany({
    where: {
      isActive: true,
      status: { not: Status.Completed },
      startDate: { not: null },
      dueDate: { not: null },
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

  // Governance Manager emails (fetched once)
  const govUsers = await db.user.findMany({
    where: {
      isActive: true,
      userRoles: { some: { role: { name: "Governance Manager" } } },
    },
    select: { email: true },
  });
  const govEmails = govUsers.map((u) => u.email);

  // Functional Leadership emails (fetched once)
  const leaderUsers = await db.user.findMany({
    where: {
      isActive: true,
      userRoles: {
        some: { role: { name: { in: ["IT Leadership", "Facilities Leadership", "Security Leadership"] } } },
      },
    },
    select: { email: true },
  });
  const leaderEmails = leaderUsers.map((u) => u.email);

  const overdueIds: string[] = [];
  const emailsSent: string[] = [];
  const skipped: string[] = [];

  for (const m of milestones) {
    const { startDate, dueDate, plannedEndDate, status } = m;
    if (!startDate || !dueDate) continue;

    const stage = getSLAStage(startDate, dueDate);
    if (!stage) continue;

    // Mark as Delayed when overdue
    if (stage === "overdue" && status !== Status.Delayed) {
      overdueIds.push(m.id);
    }

    // Skip if this stage was already notified
    const sentStages = await getSentStages(m.id);
    if (sentStages.has(stage)) {
      skipped.push(`${m.id} — stage:${stage} already sent`);
      continue;
    }

    if (!m.assignee?.email || !m.capexRequest.project) continue;

    // Build CC: Business PM + Functional Leaders + Governance Managers
    const ccSet = new Set<string>([...govEmails, ...leaderEmails]);
    const bpm = m.capexRequest.businessPm;
    if (bpm) {
      const pmIds = [bpm.itPmId, bpm.facilitiesPmId, bpm.physicalSecurityPmId].filter(Boolean) as string[];
      if (pmIds.length > 0) {
        const pmUsers = await db.user.findMany({
          where: { id: { in: pmIds }, isActive: true },
          select: { email: true },
        });
        pmUsers.forEach((u) => ccSet.add(u.email));
      }
    }
    // Don't CC the assignee (they're the To)
    ccSet.delete(m.assignee.email);

    const project = m.capexRequest.project;
    const phaseNumber = m.milestoneActivity?.phaseNumber ?? 2;
    const phaseName = PHASE_NAMES[phaseNumber] ?? `Phase ${phaseNumber}`;
    const slaPercentage = calculateSLAPercentage(startDate, dueDate);
    const refEndDate = plannedEndDate ?? dueDate;
    const remainingDays = getRemainingDays(refEndDate);
    const ccArray = Array.from(ccSet);

    sendEmail(
      slaStageReminderEmail({
        to: m.assignee.email,
        cc: ccArray.length > 0 ? ccArray : undefined,
        assigneeName: m.assignee.name,
        milestoneLabel: m.milestoneActivity?.label ?? "Milestone",
        phaseName,
        projectName: project.name,
        projectNumber: project.prjNumber,
        prjId: project.id,
        phaseNumber,
        assignedDate: startDate.toLocaleDateString("en-US"),
        plannedEndDate: refEndDate.toLocaleDateString("en-US"),
        remainingDays,
        currentStatus: status,
        slaPercentage,
        stage,
      })
    ).catch(() => {});

    await logSentStage(m.id, stage);

    emailsSent.push(
      `${m.assignee.email} — ${m.milestoneActivity?.label ?? "?"} — stage:${stage} — ${project.prjNumber}`
    );
  }

  // Bulk-mark overdue milestones as Delayed
  if (overdueIds.length > 0) {
    await db.milestoneActivitiesTracking.updateMany({
      where: { id: { in: overdueIds }, status: { not: Status.Completed } },
      data: { status: Status.Delayed },
    });
  }

  return Response.json({
    evaluated: milestones.length,
    markedDelayed: overdueIds.length,
    emailsSent: emailsSent.length,
    skipped: skipped.length,
    emails: emailsSent,
    timestamp: new Date().toISOString(),
  });
}
