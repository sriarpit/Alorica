import { db } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { ProjectCardData } from "@/components/dashboard/ProjectCard";

function unique<T>(arr: T[]): T[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}

export default async function DashboardPage() {
  const today = new Date();

  const [raw, locationRows, capexList, trackingData] = await Promise.all([
    db.project.findMany({
      include: {
        projectManager: { select: { id: true, name: true } },
        businessOwner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.location.findMany({ where: { isActive: true } }),
    db.capexRequest.findMany({
      where: { isActive: true },
      select: { id: true, projectId: true },
    }),
    db.milestoneActivitiesTracking.findMany({
      where: { isActive: true },
      select: { capExRequestId: true, status: true, plannedEndDate: true },
    }),
  ]);

  // Map capexId → projectId
  const capexToProject: Record<string, string> = {};
  for (const c of capexList) {
    if (c.projectId) capexToProject[c.id] = c.projectId;
  }

  // Group tracking records by projectId then compute risk
  const trackingByProject: Record<string, Array<{ status: string; plannedEndDate: Date | null }>> = {};
  for (const t of trackingData) {
    const pId = capexToProject[t.capExRequestId];
    if (!pId) continue;
    if (!trackingByProject[pId]) trackingByProject[pId] = [];
    trackingByProject[pId].push(t);
  }

  const riskByProject: Record<string, string> = {};
  for (const [pId, records] of Object.entries(trackingByProject)) {
    let risk = "On Time";
    for (const t of records) {
      if (t.status === "Completed") continue;
      if (!t.plannedEndDate) continue;
      const planned = new Date(t.plannedEndDate);
      const daysLeft = Math.ceil((planned.getTime() - today.getTime()) / 86400000);
      if (planned < today) {
        risk = "Delayed";
        break;
      }
      if (daysLeft <= 7 && risk !== "Delayed") {
        risk = "At Risk";
      }
    }
    riskByProject[pId] = risk;
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

  // Fall back to project data if location table is empty
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
    riskStatus: riskByProject[p.id] ?? p.riskStatus,
  }));

  const filterOptions = {
    classifications: ["Growth", "Maintenance", "Technology", "Relocation"],
    statuses: ["InProgress", "Pending", "Completed"],
    locationHierarchy,
  };

  return <DashboardClient projects={projects} filterOptions={filterOptions} />;
}
