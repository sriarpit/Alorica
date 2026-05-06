import { db } from "@/lib/prisma";

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

  const rows = activities.map((activity) => {
    const t = trackingMap.get(activity.id);
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
    };
  });

  return { project, rows, users };
}
