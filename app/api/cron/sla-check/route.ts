import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { slaReminderEmail } from "@/lib/email/templates";

export async function GET(req: NextRequest) {
  // Simple auth guard — in production use a cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all active milestones that are past their due date and not completed
  const overdue = await db.milestoneActivitiesTracking.findMany({
    where: {
      isActive: true,
      status: { not: "Completed" },
      dueDate: { lt: today },
    },
    include: {
      milestoneActivity: true,
      assignee: { select: { id: true, name: true, email: true } },
      capexRequest: {
        include: {
          project: { select: { id: true, name: true, prjNumber: true } },
        },
      },
    },
  });

  // Mark overdue milestones as Delayed
  const overdueIds = overdue.map((m) => m.id);
  if (overdueIds.length > 0) {
    await db.milestoneActivitiesTracking.updateMany({
      where: {
        id: { in: overdueIds },
        status: { not: "Completed" },
      },
      data: { status: Status.Delayed },
    });
  }

  const emailsSent: string[] = [];

  for (const milestone of overdue) {
    if (!milestone.assignee?.email) continue;
    const project = milestone.capexRequest.project;
    const label = milestone.milestoneActivity?.label ?? "Milestone";
    const dueDateStr = milestone.dueDate
      ? new Date(milestone.dueDate).toLocaleDateString("en-US")
      : "unknown";
    const daysOverdue = milestone.dueDate
      ? Math.floor((today.getTime() - new Date(milestone.dueDate).getTime()) / 86_400_000)
      : 0;

    // Determine phase number from milestone activity
    const phaseNumber = milestone.milestoneActivity?.phaseNumber ?? 2;
    const prjId = milestone.capexRequest.project?.id ?? "";

    if (project && prjId) {
      sendEmail(
        slaReminderEmail({
          to: milestone.assignee.email,
          assigneeName: milestone.assignee.name,
          milestoneLabel: label,
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId,
          phaseNumber,
          dueDate: dueDateStr,
          daysOverdue: Math.max(1, daysOverdue),
        })
      ).catch(() => {});
    }

    emailsSent.push(
      `${milestone.assignee.email} — ${label} (due ${dueDateStr}) on project ${project?.prjNumber ?? "?"}`
    );
  }

  return Response.json({
    processed: overdue.length,
    markedDelayed: overdueIds.length,
    emailsQueued: emailsSent.length,
    emails: emailsSent,
    timestamp: new Date().toISOString(),
  });
}
