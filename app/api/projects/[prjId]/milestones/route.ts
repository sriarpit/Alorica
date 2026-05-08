import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Status } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { milestoneAssignedEmail } from "@/lib/email/templates";
import { addSLADays } from "@/lib/sla";
import { autoCompleteMilestone } from "@/lib/milestones";

async function getCapexId(prjId: string) {
  const c = await db.capexRequest.findFirst({
    where: { projectId: prjId, isActive: true },
    select: { id: true },
    orderBy: { createdOn: "desc" },
  });
  return c?.id ?? null;
}

/** Returns CC emails: Business PM + Functional Leadership + Governance Managers (deduped). */
async function buildMilestoneCcList(capexId: string, excludeEmail?: string): Promise<string[]> {
  const ccSet = new Set<string>();

  // Business PM
  const bpm = await db.capexRequestBusinessPm.findFirst({
    where: { capExRequestId: capexId },
    select: { itPmId: true, facilitiesPmId: true, physicalSecurityPmId: true },
  });
  if (bpm) {
    const pmIds = [bpm.itPmId, bpm.facilitiesPmId, bpm.physicalSecurityPmId].filter(Boolean) as string[];
    if (pmIds.length > 0) {
      const pms = await db.user.findMany({
        where: { id: { in: pmIds }, isActive: true },
        select: { email: true },
      });
      pms.forEach((u) => ccSet.add(u.email));
    }
  }

  // Functional Leadership + Governance Managers
  const leaders = await db.user.findMany({
    where: {
      isActive: true,
      userRoles: {
        some: {
          role: {
            name: {
              in: ["IT Leadership", "Facilities Leadership", "Security Leadership", "Governance Manager"],
            },
          },
        },
      },
    },
    select: { email: true },
  });
  leaders.forEach((u) => ccSet.add(u.email));

  if (excludeEmail) ccSet.delete(excludeEmail);
  return Array.from(ccSet);
}

const PHASE_NAMES: Record<number, string> = {
  1: "Phase 1 – Initiation",
  2: "Phase 2 – Planning & Approval",
  3: "Phase 3 – Design & Order",
  4: "Phase 4 – Implementation / Build-Out",
  5: "Phase 5 – Site Ready",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase");

  const capexId = await getCapexId(params.prjId);

  const activities = await db.milestoneActivity.findMany({
    where: {
      isActive: true,
      ...(phase && { phaseNumber: Number(phase) }),
    },
    orderBy: { order: "asc" },
  });

  const trackingRecords = capexId
    ? await db.milestoneActivitiesTracking.findMany({
        where: {
          capExRequestId: capexId,
          milestoneActivitiesId: { in: activities.map((a) => a.id) },
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      })
    : [];

  const trackingMap = new Map(trackingRecords.map((r) => [r.milestoneActivitiesId, r]));

  const result = activities.map((activity) => {
    const tracking = trackingMap.get(activity.id);
    return {
      activity,
      tracking: tracking
        ? {
            id: tracking.id,
            status: tracking.status,
            assignedTo: tracking.assignedTo,
            assigneeName: tracking.assignee?.name ?? null,
            startDate: tracking.startDate?.toISOString() ?? null,
            endDate: tracking.endDate?.toISOString() ?? null,
            dueDate: tracking.dueDate?.toISOString() ?? null,
            plannedEndDate: tracking.plannedEndDate?.toISOString() ?? null,
            completedDate: tracking.completedDate?.toISOString() ?? null,
            remarks: tracking.remarks ?? null,
            isActive: tracking.isActive,
          }
        : null,
    };
  });

  return Response.json(result);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const body = await req.json();

  const { milestoneActivityId, trackingId, ...data } = body;

  let capexId = await getCapexId(params.prjId);
  if (!capexId) {
    const capex = await db.capexRequest.create({
      data: {
        projectId: params.prjId,
        projectManagerId: userId,
        state: "Draft",
        requestStatus: "Draft",
        createdBy: userId,
      },
    });
    capexId = capex.id;
  }

  const activity = await db.milestoneActivity.findUnique({
    where: { id: milestoneActivityId },
    select: { sla: true, dayType: true, phaseNumber: true, label: true, order: true },
  });

  const startDate = data.startDate ? new Date(data.startDate) : null;
  const completedDate = data.completedDate ? new Date(data.completedDate) : null;

  let dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (!dueDate && startDate && activity?.sla) {
    dueDate = addSLADays(startDate, activity.sla, activity.dayType);
  }

  const effectiveStartDate =
    data.status === "Completed" && !startDate && completedDate ? completedDate : startDate;

  // Phase 3: auto-calculate plannedStartDate and plannedEndDate when moving to InProgress
  let plannedEndDateOverride: Date | null = data.plannedEndDate ? new Date(data.plannedEndDate) : null;
  if (
    activity?.phaseNumber === 3 &&
    data.status === "InProgress" &&
    !data.plannedEndDate &&
    activity.order &&
    capexId
  ) {
    // Find the previous milestone's completedDate as plannedStartDate
    const prevActivity = await db.milestoneActivity.findFirst({
      where: { isActive: true, phaseNumber: 3, order: { lt: activity.order } },
      orderBy: { order: "desc" },
      select: { id: true },
    });
    if (prevActivity) {
      const prevTracking = await db.milestoneActivitiesTracking.findFirst({
        where: { capExRequestId: capexId, milestoneActivitiesId: prevActivity.id, isActive: true },
        select: { completedDate: true },
      });
      if (prevTracking?.completedDate) {
        const plannedStart = prevTracking.completedDate;
        plannedEndDateOverride = activity.sla
          ? addSLADays(plannedStart, activity.sla, activity.dayType)
          : null;
      }
    }
  }

  const updateData = {
    status: data.status as Status | undefined,
    assignedTo: data.assignedTo || null,
    startDate: effectiveStartDate,
    endDate: completedDate,
    dueDate,
    plannedEndDate: plannedEndDateOverride,
    completedDate,
    remarks: data.remarks || null,
    isActive: true,
    updatedById: userId,
    updateTime: new Date(),
  };

  // Detect assignment change before saving
  let previousAssignee: string | null = null;
  let previousStatus: Status | null = null;
  if (trackingId) {
    const existing = await db.milestoneActivitiesTracking.findUnique({
      where: { id: trackingId },
      select: { assignedTo: true, status: true },
    });
    previousAssignee = existing?.assignedTo ?? null;
    previousStatus = existing?.status ?? null;
  }

  let record;
  if (trackingId) {
    record = await db.milestoneActivitiesTracking.update({
      where: { id: trackingId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        milestoneActivity: { select: { label: true, phaseNumber: true } },
      },
    });
  } else {
    record = await db.milestoneActivitiesTracking.create({
      data: {
        capExRequestId: capexId,
        milestoneActivitiesId: milestoneActivityId,
        ...updateData,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        milestoneActivity: { select: { label: true, phaseNumber: true } },
      },
    });
  }

  const assignee = (record as any).assignee as { name: string; email: string } | null;
  const activityInfo = (record as any).milestoneActivity as { label: string; phaseNumber: number } | null;
  const project = await db.project.findUnique({
    where: { id: params.prjId },
    select: { name: true, prjNumber: true },
  });

  const phaseNumber = activityInfo?.phaseNumber ?? activity?.phaseNumber ?? 2;
  const phaseName = PHASE_NAMES[phaseNumber] ?? `Phase ${phaseNumber}`;
  const ccList = await buildMilestoneCcList(capexId, assignee?.email ?? undefined);

  // ── Assignment email ────────────────────────────────────────────────────────
  const newAssigneeId = data.assignedTo || null;
  const isNewAssignment = newAssigneeId && newAssigneeId !== previousAssignee;
  if (isNewAssignment && assignee?.email && project && activityInfo) {
    sendEmail(
      milestoneAssignedEmail({
        to: assignee.email,
        cc: ccList.length > 0 ? ccList : undefined,
        assigneeName: assignee.name,
        milestoneLabel: activityInfo.label,
        projectName: project.name,
        projectNumber: project.prjNumber,
        prjId: params.prjId,
        phaseNumber,
        phaseName,
        assignedDate: new Date().toLocaleDateString("en-US"),
        dueDate: record.dueDate ? new Date(record.dueDate).toLocaleDateString("en-US") : undefined,
        plannedEndDate: record.plannedEndDate ? new Date(record.plannedEndDate).toLocaleDateString("en-US") : undefined,
      })
    ).catch(() => {});
  }

  // ── Status-change emails ────────────────────────────────────────────────────
  const newStatus = data.status as Status | undefined;
  const statusChanged = newStatus && newStatus !== previousStatus;

  if (statusChanged && project && activityInfo) {
    const milestoneUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/projects/${params.prjId}/milestones/phase-${phaseNumber}`;

    // Completed → notify CC (Governance Manager, Business PM, Functional Leadership)
    if (newStatus === Status.Completed && ccList.length > 0) {
      sendEmail({
        to: ccList,
        subject: `Milestone Completed — ${project.prjNumber}`,
        html: `<p>The milestone <strong>${activityInfo.label}</strong> (${phaseName}) on project <strong>${project.prjNumber} — ${project.name}</strong> has been marked <strong>Completed</strong>${completedDate ? ` on ${completedDate.toLocaleDateString("en-US")}` : ""}.</p><p><a href="${milestoneUrl}">View Milestone</a></p>`,
      }).catch(() => {});
    }

    // Delayed → notify assignee + CC
    if (newStatus === Status.Delayed) {
      const toList = [
        ...(assignee?.email ? [assignee.email] : []),
        ...ccList,
      ];
      if (toList.length > 0) {
        sendEmail({
          to: toList,
          subject: `Milestone Delayed — ${project.prjNumber}`,
          html: `<p>The milestone <strong>${activityInfo.label}</strong> (${phaseName}) on project <strong>${project.prjNumber} — ${project.name}</strong> has been marked <strong>Delayed</strong>. Immediate action required.</p><p><a href="${milestoneUrl}">View Milestone</a></p>`,
        }).catch(() => {});
      }
    }
  }

  // ── Progress percentage ─────────────────────────────────────────────────────
  const allTracking = await db.milestoneActivitiesTracking.findMany({
    where: { capExRequestId: capexId, isActive: true },
    select: { status: true },
  });
  const allActivities = await db.milestoneActivity.count({ where: { isActive: true } });
  if (allActivities > 0) {
    const completed = allTracking.filter((t) => t.status === "Completed").length;
    await db.project.update({
      where: { id: params.prjId },
      data: { progressPct: Math.round((completed / allActivities) * 100) },
    });
  }

  // ── Auto-advance project phase ──────────────────────────────────────────────
  const currentProject = await db.project.findUnique({
    where: { id: params.prjId },
    select: { phase: true },
  });
  if (currentProject) {
    const phaseOrder = ["Phase1", "Phase2", "Phase3", "Phase4", "Phase5"];
    const currentIndex = phaseOrder.indexOf(currentProject.phase);
    if (currentIndex >= 0 && currentIndex < 4) {
      const currentPhaseNum = currentIndex + 1;
      const phaseActivities = await db.milestoneActivity.findMany({
        where: { isActive: true, phaseNumber: currentPhaseNum },
        select: { id: true },
      });
      if (phaseActivities.length > 0) {
        const phaseTracking = await db.milestoneActivitiesTracking.findMany({
          where: {
            capExRequestId: capexId,
            milestoneActivitiesId: { in: phaseActivities.map((a) => a.id) },
            isActive: true,
          },
          select: { status: true },
        });
        const allPhaseDone =
          phaseTracking.length === phaseActivities.length &&
          phaseTracking.every((t) => t.status === "Completed");
        if (allPhaseDone) {
          await db.project.update({
            where: { id: params.prjId },
            data: { phase: phaseOrder[currentIndex + 1] as any },
          });
        }
      }
    }
  }

  // ── Auto-complete "Go Live Completed" when all Phase 5 manual milestones done
  if (data.status === "Completed" && activity?.phaseNumber === 5) {
    const phase5Activities = await db.milestoneActivity.findMany({
      where: { isActive: true, phaseNumber: 5 },
      select: { id: true, label: true },
    });
    const manualPhase5 = phase5Activities.filter((a) => !a.label.includes("Go Live"));
    if (manualPhase5.length > 0) {
      const phase5Tracking = await db.milestoneActivitiesTracking.findMany({
        where: {
          capExRequestId: capexId,
          milestoneActivitiesId: { in: manualPhase5.map((a) => a.id) },
          isActive: true,
        },
        select: { milestoneActivitiesId: true, status: true },
      });
      const completedIds = new Set(
        phase5Tracking.filter((t) => t.status === "Completed").map((t) => t.milestoneActivitiesId)
      );
      const allManualDone = manualPhase5.every((a) => completedIds.has(a.id));
      if (allManualDone) {
        await autoCompleteMilestone(capexId, params.prjId, "Go Live Completed", userId);
      }
    }
  }

  return Response.json({
    id: record.id,
    status: record.status,
    assignedTo: record.assignedTo,
    assigneeName: assignee?.name ?? null,
    startDate: record.startDate?.toISOString() ?? null,
    endDate: record.endDate?.toISOString() ?? null,
    dueDate: record.dueDate?.toISOString() ?? null,
    plannedEndDate: record.plannedEndDate?.toISOString() ?? null,
    completedDate: record.completedDate?.toISOString() ?? null,
    remarks: record.remarks ?? null,
    isActive: record.isActive,
  });
}
