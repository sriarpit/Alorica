import { db } from "@/lib/prisma";

interface Attachment {
  id: string;
  fileName: string;
  fileContent: string;
}

export interface MilestoneRowWithAttachments {
  activity: {
    id: number;
    label: string;
    order: number;
    phaseNumber: number;
    sla: number | null;
    sourceSystem: string | null;
    dayType: string | null;
    roleType: string | null;
  };
  tracking: {
    id: string;
    status: string;
    assignedTo: string | null;
    assigneeName: string | null;
    startDate: string | null;
    endDate: string | null;
    dueDate: string | null;
    plannedEndDate: string | null;
    completedDate: string | null;
    remarks: string | null;
    isActive: boolean;
  } | null;
  initialDocs: Attachment[];
  initialImages: Attachment[];
}

export async function getMilestonePageData(prjId: string, phaseNumber: number) {
  const [project, activities, users] = await Promise.all([
    db.project.findUnique({
      where: { id: prjId },
      include: { projectManager: { select: { id: true, name: true } } },
    }),
    db.milestoneActivity.findMany({
      where: { isActive: true, phaseNumber },
      orderBy: { order: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) return null;

  const capex = await db.capexRequest.findFirst({
    where: { projectId: prjId, isActive: true },
    select: { id: true },
    orderBy: { createdOn: "desc" },
  });

  const trackingRecords = capex
    ? await db.milestoneActivitiesTracking.findMany({
        where: {
          capExRequestId: capex.id,
          milestoneActivitiesId: { in: activities.map((a) => a.id) },
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      })
    : [];

  const trackingMap = new Map(trackingRecords.map((r) => [r.milestoneActivitiesId, r]));

  // Fetch all milestone attachments for this phase in one query
  const activityIdStrs = activities.map((a) => String(a.id));
  const allAttachments = capex
    ? await db.capexAttachment.findMany({
        where: {
          capExRequestId: capex.id,
          sectionId: {
            in: ["MilestoneActivitesFileupload", "MilestoneActivitesImageFileUpload"],
          },
          secondaryId: { in: activityIdStrs },
        },
        select: { id: true, fileName: true, fileContent: true, sectionId: true, secondaryId: true },
        orderBy: { id: "desc" },
      })
    : [];

  // Group attachments by activity ID
  const docMap: Record<string, Attachment[]> = {};
  const imgMap: Record<string, Attachment[]> = {};
  for (const att of allAttachments) {
    const key = att.secondaryId ?? "";
    if (att.sectionId === "MilestoneActivitesFileupload") {
      docMap[key] = [...(docMap[key] ?? []), { id: att.id, fileName: att.fileName, fileContent: att.fileContent }];
    } else if (att.sectionId === "MilestoneActivitesImageFileUpload") {
      imgMap[key] = [...(imgMap[key] ?? []), { id: att.id, fileName: att.fileName, fileContent: att.fileContent }];
    }
  }

  const rows: MilestoneRowWithAttachments[] = activities.map((activity) => {
    const t = trackingMap.get(activity.id);
    const key = String(activity.id);
    return {
      activity: {
        id: activity.id,
        label: activity.label,
        order: activity.order,
        phaseNumber: activity.phaseNumber,
        sla: activity.sla ?? null,
        sourceSystem: activity.sourceSystem ?? null,
        dayType: activity.dayType ?? null,
        roleType: activity.roleType ?? null,
      },
      tracking: t
        ? {
            id: t.id,
            status: t.status,
            assignedTo: t.assignedTo ?? null,
            assigneeName: t.assignee?.name ?? null,
            startDate: t.startDate?.toISOString() ?? null,
            endDate: t.endDate?.toISOString() ?? null,
            dueDate: t.dueDate?.toISOString() ?? null,
            plannedEndDate: t.plannedEndDate?.toISOString() ?? null,
            completedDate: t.completedDate?.toISOString() ?? null,
            remarks: t.remarks ?? null,
            isActive: t.isActive,
          }
        : null,
      initialDocs: docMap[key] ?? [],
      initialImages: imgMap[key] ?? [],
    };
  });

  return { project, rows, users, capexId: capex?.id ?? null };
}

// ─── Auto-complete a system milestone by partial label match ─────────────────

export async function autoCompleteMilestone(
  capexId: string,
  projectId: string,
  labelContains: string,
  userId?: string
): Promise<void> {
  const activity = await db.milestoneActivity.findFirst({
    where: { isActive: true, label: { contains: labelContains, mode: "insensitive" } },
    select: { id: true },
  });
  if (!activity) return;

  const now = new Date();
  const existing = await db.milestoneActivitiesTracking.findFirst({
    where: { capExRequestId: capexId, milestoneActivitiesId: activity.id },
    select: { id: true, startDate: true },
  });

  if (existing) {
    await db.milestoneActivitiesTracking.update({
      where: { id: existing.id },
      data: {
        status: "Completed",
        startDate: existing.startDate ?? now,
        completedDate: now,
        isActive: true,
        updatedById: userId,
        updateTime: now,
      },
    });
  } else {
    await db.milestoneActivitiesTracking.create({
      data: {
        capExRequestId: capexId,
        milestoneActivitiesId: activity.id,
        status: "Completed",
        startDate: now,
        completedDate: now,
        isActive: true,
        updatedById: userId,
        updateTime: now,
      },
    });
  }

  // Update overall project progress
  const allTracking = await db.milestoneActivitiesTracking.findMany({
    where: { capExRequestId: capexId, isActive: true },
    select: { status: true },
  });
  const allActivities = await db.milestoneActivity.count({ where: { isActive: true } });
  if (allActivities > 0) {
    const completed = allTracking.filter((t) => t.status === "Completed").length;
    const pct = Math.round((completed / allActivities) * 100);
    await db.project.update({
      where: { id: projectId },
      data: { progressPct: pct },
    });
  }
}
