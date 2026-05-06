import { db } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { ProjectCardData } from "@/components/dashboard/ProjectCard";

function unique<T>(arr: T[]): T[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}

export default async function DashboardPage() {
  const raw = await db.project.findMany({
    include: {
      projectManager: { select: { id: true, name: true } },
      businessOwner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates to strings for client component
  const projects: ProjectCardData[] = raw.map((p) => ({
    id: p.id,
    prjNumber: p.prjNumber,
    name: p.name,
    projectManager: p.projectManager,
    businessOwner: p.businessOwner,
    status: p.status,
    phase: p.phase,
    region: p.region,
    country: p.country,
    location: p.location,
    classification: p.classification,
    startDate: p.startDate?.toISOString() ?? null,
    goLiveDate: p.goLiveDate?.toISOString() ?? null,
    progressPct: p.progressPct,
    riskStatus: p.riskStatus,
  }));

  // Compute unique filter option values from the project data
  const filterOptions = {
    regions: unique(projects.map((p) => p.region).filter(Boolean) as string[]).sort(),
    countries: unique(projects.map((p) => p.country).filter(Boolean) as string[]).sort(),
    locations: unique(projects.map((p) => p.location).filter(Boolean) as string[]).sort(),
    classifications: unique(projects.map((p) => p.classification).filter(Boolean) as string[]).sort(),
    statuses: unique(projects.map((p) => p.status)).sort(),
  };

  return <DashboardClient projects={projects} filterOptions={filterOptions} />;
}
