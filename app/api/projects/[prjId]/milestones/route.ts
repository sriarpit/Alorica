import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Status } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { milestoneAssignedEmail } from "@/lib/email/templates";

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
    // Create a minimal capex request so milestones can be tracked
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

  const updateData = {
    status: data.status as Status | undefined,
    assignedTo: data.assignedTo || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
    completedDate: data.completedDate ? new Date(data.completedDate) : null,
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
      sendEmail(
        milestoneAssignedEmail({
          to: assignee.email,
          assigneeName: assignee.name,
          milestoneLabel: activity.label,
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId: params.prjId,
          phaseNumber: activity.phaseNumber,
          dueDate: record.dueDate
            ? new Date(record.dueDate).toLocaleDateString("en-US")
            : undefined,
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
