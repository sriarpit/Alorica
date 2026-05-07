import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { MilestoneTrackingClient } from "@/components/milestone-tracking/MilestoneTrackingClient";

const TIMELINE_CHECKPOINTS = [
  { key: "ProjectCreated", label: "Project Created" },
  { key: "CapExBusinessCaseApproval", label: "CapEx Business Case Approval" },
  { key: "CAPEXIDcreated", label: "CAPEX ID Created" },
  { key: "Facilityworkcompleted", label: "Facility Work Completed" },
  { key: "ITordersreceived", label: "IT Orders Received" },
  { key: "ITDeploymentCompleted", label: "IT Deployment Completed" },
  { key: "ClientIT_PCsDeployed", label: "Client IT – PCs Deployed" },
  { key: "ITHandovertoClientPM", label: "IT Handover To Client PM" },
] as const;

const PHASE_LABELS: Record<number, string> = {
  1: "Initiation",
  2: "Planning & Approval",
  3: "Design & Order",
  4: "Implementation / Build-Out",
  5: "Site Ready",
};

function fmt(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

export default async function MilestoneTrackingDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const today = new Date();

  const [project, allProjects] = await Promise.all([
    db.project.findUnique({
      where: { id: params.projectId },
      include: {
        projectManager: { select: { id: true, name: true } },
        businessOwner: { select: { id: true, name: true } },
        capexRequests: {
          where: { isActive: true },
          include: {
            financeApproval: true,
            milestones: {
              where: { isActive: true },
              include: {
                milestoneActivity: true,
                assignee: { select: { id: true, name: true } },
              },
              orderBy: { milestoneActivity: { order: "asc" } },
            },
          },
          take: 1,
          orderBy: { createdOn: "desc" },
        },
      },
    }),
    db.project.findMany({
      select: { id: true, name: true, prjNumber: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!project) notFound();

  const capex = project.capexRequests[0] ?? null;
  const milestones = capex?.milestones ?? [];
  const financeApproval = capex?.financeApproval as any;

  // ── Timeline checkpoints ─────────────────────────────────────────────────
  const timelineCheckpoints = TIMELINE_CHECKPOINTS.map((cp, idx) => {
    let status: "completed" | "in-progress" | "pending" | "delayed" = "pending";
    let completedDate: string | null = null;

    if (idx === 0) {
      status = "completed";
      completedDate = fmt(project.startDate);
    } else if (cp.key === "CapExBusinessCaseApproval") {
      if (financeApproval?.regCorpApproveById) {
        status = "completed";
        completedDate = fmt(financeApproval.regCorpApproverDate);
      }
    } else if (cp.key === "CAPEXIDcreated") {
      if (financeApproval?.projectCapex) {
        status = "completed";
        completedDate = fmt(financeApproval.projectStatusDate);
      }
    } else {
      const keyword = cp.label.toLowerCase().split(" ").slice(0, 3).join(" ");
      const match = milestones.find(
        (m) => m.milestoneActivity?.label?.toLowerCase().includes(keyword.toLowerCase().slice(0, 8))
      );
      if (match) {
        if (match.status === "Completed") {
          status = "completed";
          completedDate = fmt(match.completedDate ?? match.endDate);
        } else if (match.status === "InProgress" || match.status === "WorkinProgress") {
          if (match.plannedEndDate && match.plannedEndDate < today) status = "delayed";
          else status = "in-progress";
        }
      }
    }

    return { label: cp.label, status, completedDate };
  });

  // ── Phases ───────────────────────────────────────────────────────────────
  const phases = [1, 2, 3, 4, 5].map((phaseNum) => {
    const phaseMilestones = milestones.filter(
      (m) => m.milestoneActivity?.phaseNumber === phaseNum
    );
    const total = phaseMilestones.length;
    const completedCount = phaseMilestones.filter((m) => m.status === "Completed").length;
    const completionPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // Phase risk status
    let phaseRisk = "On Time";
    let phaseMinStart: Date | null = null;
    let phaseMaxEnd: Date | null = null;

    for (const m of phaseMilestones) {
      const plannedEnd = m.plannedEndDate ?? m.dueDate;
      if (m.status !== "Completed" && plannedEnd) {
        const diffDays = Math.ceil((today.getTime() - plannedEnd.getTime()) / 86400000);
        if (diffDays > 0) phaseRisk = "Delayed";
        else if (diffDays === 0 && phaseRisk !== "Delayed") phaseRisk = "On Risk";
      }
      if (plannedEnd && (!phaseMaxEnd || plannedEnd > phaseMaxEnd)) phaseMaxEnd = plannedEnd;
      const start = m.startDate ?? m.dueDate;
      if (start && (!phaseMinStart || start < phaseMinStart)) phaseMinStart = start;
    }

    // Milestone details
    const milestoneData = phaseMilestones.map((m) => {
      const plannedEnd = m.plannedEndDate ?? m.dueDate;
      const actualStart = m.startDate;
      const actualEnd = m.completedDate ?? m.endDate;

      // Risk
      let riskStatus = "On Time";
      let delayedDays: number | null = null;
      if (m.status !== "Completed" && plannedEnd) {
        const diff = Math.ceil((today.getTime() - plannedEnd.getTime()) / 86400000);
        if (diff > 0) { riskStatus = "Delayed"; delayedDays = diff; }
        else if (diff === 0) riskStatus = "On Risk";
      } else if (m.status === "Completed" && plannedEnd && actualEnd) {
        const diff = Math.ceil((actualEnd.getTime() - plannedEnd.getTime()) / 86400000);
        if (diff > 0) { riskStatus = "Delayed"; delayedDays = diff; }
      }

      // Days taken
      let daysTaken: number | null = null;
      if (actualStart) {
        const end = actualEnd ?? today;
        daysTaken = Math.max(1, Math.ceil((end.getTime() - actualStart.getTime()) / 86400000));
      }

      return {
        id: m.id,
        label: m.milestoneActivity?.label ?? "Milestone",
        owner: (m as any).assignee?.name ?? null,
        status: m.status ?? "Pending",
        daysTaken,
        dueDate: fmt(m.dueDate),
        plannedStartDate: fmt(actualStart), // best available planned start
        plannedEndDate: fmt(plannedEnd),
        actualStartDate: fmt(actualStart),
        actualEndDate: fmt(actualEnd),
        remarks: m.remarks ?? null,
        riskStatus,
        delayedDays,
        sla: (m.milestoneActivity as any)?.sla ?? null,
      };
    });

    return {
      phase: phaseNum,
      label: PHASE_LABELS[phaseNum],
      completionPct,
      riskStatus: phaseRisk,
      plannedStartDate: fmt(phaseMinStart),
      plannedEndDate: fmt(phaseMaxEnd),
      milestones: milestoneData,
    };
  });

  // Google Maps link: use stored link or construct from location
  const mapsLink =
    capex?.googlemapsLocationlink ||
    `https://maps.google.com/?q=${encodeURIComponent(
      [project.location, project.country, project.region].filter(Boolean).join(", ")
    )}`;

  const pageData = {
    project: {
      id: project.id,
      prjNumber: project.prjNumber,
      name: project.name,
      status: project.status,
      phase: project.phase,
      region: project.region,
      country: project.country,
      location: project.location,
      startDate: fmt(project.startDate),
      goLiveDate: fmt(project.goLiveDate),
      progressPct: project.progressPct,
      projectManager: project.projectManager,
      businessOwner: project.businessOwner,
      googlemapsLink: mapsLink,
    },
    allProjects: allProjects.map((p) => ({ id: p.id, name: p.name, prjNumber: p.prjNumber })),
    timelineCheckpoints,
    phases,
  };

  return <MilestoneTrackingClient data={pageData} />;
}
