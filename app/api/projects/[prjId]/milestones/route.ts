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

export async function GET(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase");

  const capexId = await getCapexId(params.prjId);

  // Fetch all milestone activities for the phase
  const activities = await db.milestoneActivity.findMany({
    where: {
      isActive: true,
      ...(phase && { phaseNumber: Number(phase) }),
    },
    orderBy: { order: "asc" },
  });

  // Fetch existing tracking records for this capex request
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

  // Fetch activity for SLA calculation
  const activity = await db.milestoneActivity.findUnique({
    where: { id: milestoneActivityId },
    select: { sla: true, dayType: true, phaseNumber: true },
  });

  const startDate = data.startDate ? new Date(data.startDate) : null;
  const completedDate = data.completedDate ? new Date(data.completedDate) : null;

  // Auto-compute dueDate from startDate + SLA when not explicitly provided
  let dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (!dueDate && startDate && activity?.sla) {
    dueDate = addSLADays(startDate, activity.sla, activity.dayType);
  }

  // Direct-completion rule: if Completed with no startDate, both dates = completedDate
  const effectiveStartDate =
    data.status === "Completed" && !startDate && completedDate
      ? completedDate
      : startDate;

  const updateData = {
    status: data.status as Status | undefined,
    assignedTo: data.assignedTo || null,
    startDate: effectiveStartDate,
    endDate: completedDate,
    dueDate,
    plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
    completedDate,
    remarks: data.remarks || null,
    isActive: true,
    updatedById: userId,
    updateTime: new Date(),
  };

  // Detect new assignee before saving (to send notification after)
  let previousAssignee: string | null = null;
  if (trackingId && data.assignedTo) {
    const existing = await db.milestoneActivitiesTracking.findUnique({
      where: { id: trackingId },
      select: { assignedTo: true },
    });
    previousAssignee = existing?.assignedTo ?? null;
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

  // Send assignment email if assignee is newly set
  const newAssigneeId = data.assignedTo || null;
  const isNewAssignment = newAssigneeId && newAssigneeId !== previousAssignee;
  if (isNewAssignment) {
    const assignee = (record as any).assignee;
    const activity = (record as any).milestoneActivity;
    const project = await db.project.findUnique({
      where: { id: params.prjId },
      select: { name: true, prjNumber: true },
    });
    if (assignee?.email && project && activity) {
      const phaseNames: Record<number, string> = {
        1: "Phase 1 – Initiation",
        2: "Phase 2 – Planning & Approval",
        3: "Phase 3 – Design & Order",
        4: "Phase 4 – Implementation / Build-Out",
        5: "Phase 5 – Site Ready",
      };
      // Fetch Business PM email for CC
      const bpmCc = await db.capexRequestBusinessPm.findFirst({
        where: { capExRequestId: capexId },
        select: { itPmId: true },
      });
      const bpmCcEmail = bpmCc?.itPmId
        ? (await db.user.findUnique({ where: { id: bpmCc.itPmId }, select: { email: true } }))?.email
        : undefined;
      sendEmail(
        milestoneAssignedEmail({
          to: assignee.email,
          cc: bpmCcEmail ?? undefined,
          assigneeName: assignee.name,
          milestoneLabel: activity.label,
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId: params.prjId,
          phaseNumber: activity.phaseNumber,
          phaseName: phaseNames[activity.phaseNumber],
          assignedDate: new Date().toLocaleDateString("en-US"),
          dueDate: record.dueDate ? new Date(record.dueDate).toLocaleDateString("en-US") : undefined,
          plannedEndDate: record.plannedEndDate ? new Date(record.plannedEndDate).toLocaleDateString("en-US") : undefined,
        })
      ).catch(() => {});
    }
  }

  // Update project progress percentage based on all milestones
  const allTracking = await db.milestoneActivitiesTracking.findMany({
    where: { capExRequestId: capexId, isActive: true },
    select: { status: true },
  });
  const allActivities = await db.milestoneActivity.count({ where: { isActive: true } });
  if (allActivities > 0) {
    const completed = allTracking.filter((t) => t.status === "Completed").length;
    const pct = Math.round((completed / allActivities) * 100);
    await db.project.update({
      where: { id: params.prjId },
      data: { progressPct: pct },
    });
  }

  // Auto-advance project phase when all milestones in current phase are completed
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

  // Auto-complete "Go Live Completed" when all Phase 5 manual milestones are done
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
    assigneeName: (record as any).assignee?.name ?? null,
    startDate: record.startDate?.toISOString() ?? null,
    endDate: record.endDate?.toISOString() ?? null,
    dueDate: record.dueDate?.toISOString() ?? null,
    plannedEndDate: record.plannedEndDate?.toISOString() ?? null,
    completedDate: record.completedDate?.toISOString() ?? null,
    remarks: record.remarks ?? null,
    isActive: record.isActive,
  });
}
