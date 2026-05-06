import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ProjectsClient, type ProjectRowData } from "@/components/projects/ProjectsClient";

function unique<T>(arr: T[]): T[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}

export default async function ProjectRequestsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";

  const raw = await db.project.findMany({
    include: {
      projectManager: { select: { id: true, name: true } },
      businessOwner: { select: { id: true, name: true } },
      capexRequests: {
        take: 1,
        orderBy: { createdOn: "desc" },
        select: { id: true, state: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Find project IDs where current user has milestone assignments
  const assignedProjectIdsSet = new Set<string>();
  if (userId) {
    const assignments = await db.milestoneActivitiesTracking.findMany({
      where: { assignedTo: userId, isActive: true },
      select: {
        capexRequest: { select: { projectId: true } },
      },
    });
    for (const a of assignments) {
      if (a.capexRequest?.projectId) {
        assignedProjectIdsSet.add(a.capexRequest.projectId);
      }
    }
  }
  const assignedProjectIds = Array.from(assignedProjectIdsSet);

  const projects: ProjectRowData[] = raw.map((p) => ({
    id: p.id,
    prjNumber: p.prjNumber,
    name: p.name,
    projectManager: p.projectManager,
    businessOwner: p.businessOwner ?? null,
    status: p.status,
    phase: p.phase,
    region: p.region ?? null,
    country: p.country ?? null,
    location: p.location ?? null,
    classification: p.classification ?? null,
    goLiveDate: p.goLiveDate?.toISOString() ?? null,
    capexState: p.capexRequests[0]?.state ?? "Draft",
    capexRequestId: p.capexRequests[0]?.id ?? null,
  }));

  const filterOptions = {
    regions: unique(projects.map((p) => p.region).filter(Boolean) as string[]).sort(),
    statuses: unique(projects.map((p) => p.status)).sort(),
  };

  return (
    <ProjectsClient
      projects={projects}
      assignedProjectIds={assignedProjectIds}
      currentUserId={userId}
      filterOptions={filterOptions}
    />
  );
}
