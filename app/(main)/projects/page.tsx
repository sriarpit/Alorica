import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ProjectsClient, type ProjectRowData } from "@/components/projects/ProjectsClient";

export default async function ProjectRequestsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const userRoles: string[] = (session?.user as any)?.roles ?? [];
  const isGovernanceManager = userRoles.includes("Governance Manager");

  const [raw, locationRows] = await Promise.all([
    db.project.findMany({
      where: isGovernanceManager ? undefined : { isActive: true },
      include: {
        projectManager: { select: { id: true, name: true } },
        businessOwner: { select: { id: true, name: true } },
        capexRequests: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdOn: "desc" },
          select: { id: true, state: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.location.findMany({ where: { isActive: true } }),
  ]);

  // Find project IDs where current user has milestone assignments
  const assignedProjectIdsSet = new Set<string>();
  if (userId) {
    const assignments = await db.milestoneActivitiesTracking.findMany({
      where: { assignedTo: userId, isActive: true },
      select: { capexRequest: { select: { projectId: true } } },
    });
    for (const a of assignments) {
      if (a.capexRequest?.projectId) assignedProjectIdsSet.add(a.capexRequest.projectId);
    }
  }

  // Build location hierarchy: { region: { country: location[] } }
  const locationHierarchy: Record<string, Record<string, string[]>> = {};
  for (const loc of locationRows) {
    if (!loc.regions || !loc.countries || !loc.locations) continue;
    if (!locationHierarchy[loc.regions]) locationHierarchy[loc.regions] = {};
    if (!locationHierarchy[loc.regions][loc.countries])
      locationHierarchy[loc.regions][loc.countries] = [];
    if (!locationHierarchy[loc.regions][loc.countries].includes(loc.locations))
      locationHierarchy[loc.regions][loc.countries].push(loc.locations);
  }

  // Fallback: derive hierarchy from project data if location table is empty
  if (Object.keys(locationHierarchy).length === 0) {
    for (const p of raw) {
      const region = p.region ?? "";
      const country = p.country ?? "";
      const location = p.location ?? "";
      if (!region) continue;
      if (!locationHierarchy[region]) locationHierarchy[region] = {};
      if (country) {
        if (!locationHierarchy[region][country]) locationHierarchy[region][country] = [];
        if (location && !locationHierarchy[region][country].includes(location))
          locationHierarchy[region][country].push(location);
      }
    }
  }

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
    isActive: (p as any).isActive ?? true,
  }));

  return (
    <ProjectsClient
      projects={projects}
      assignedProjectIds={Array.from(assignedProjectIdsSet)}
      currentUserId={userId}
      userRoles={userRoles}
      locationHierarchy={locationHierarchy}
    />
  );
}
