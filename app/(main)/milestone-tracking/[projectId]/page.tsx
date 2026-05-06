import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, ExternalLink } from "lucide-react";

const TIMELINE_CHECKPOINTS = [
  { key: "ProjectCreated", label: "Project Created" },
  { key: "CapExBusinessCaseApproval", label: "CapEx Business Case Approval" },
  { key: "CAPEXIDcreated", label: "CAPEX ID Created" },
  { key: "Facilityworkcompleted", label: "Facility Work Completed" },
  { key: "ITordersreceived", label: "IT Orders Received" },
  { key: "ITDeploymentCompleted", label: "IT Deployment Completed" },
  { key: "ClientIT_PCsDeployed", label: "Client IT — PCs Deployed" },
  { key: "ITHandovertoClientPM", label: "IT Handover To Client PM" },
] as const;

export default async function MilestoneTrackingDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    include: {
      projectManager: true,
      capexRequests: {
        include: {
          milestones: {
            include: { milestoneActivity: true },
            orderBy: { milestoneActivity: { order: "asc" } },
          },
          financeApproval: true,
        },
        take: 1,
        orderBy: { createdOn: "desc" },
      },
    },
  });

  if (!project) notFound();

  const capex = project.capexRequests[0];
  const milestones = capex?.milestones ?? [];

  const phaseGroups = [2, 3, 4, 5].map((phase) => ({
    phase,
    label: ["Planning & Approval", "Design & Order", "Implementation / Build-Out", "Site Ready"][
      phase - 2
    ],
    milestones: milestones.filter((m) => m.milestoneActivity?.phaseNumber === phase),
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{project.prjNumber}</p>
          </div>
          <Badge
            variant={
              project.status === "Completed"
                ? "completed"
                : project.status === "InProgress"
                ? "in-progress"
                : "pending"
            }
          >
            {project.status}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Project Lead</p>
            <p className="font-medium mt-0.5">{project.projectManager?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Start Date</p>
            <p className="font-medium mt-0.5">
              {project.startDate
                ? new Date(project.startDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Go-Live Date</p>
            <p className="font-medium mt-0.5">
              {project.goLiveDate
                ? new Date(project.goLiveDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Location</p>
            <p className="font-medium mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-400" />
              {project.location ?? "—"}, {project.country ?? ""}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-semibold">{project.progressPct}%</span>
          </div>
          <Progress value={project.progressPct} className="h-2" />
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-5">Project Timeline</h3>
        <div className="relative flex items-start justify-between overflow-x-auto pb-2">
          {TIMELINE_CHECKPOINTS.map((cp, idx) => {
            const isCompleted = idx === 0; // Phase 1 always completed if project exists
            return (
              <div key={cp.key} className="flex flex-col items-center flex-1 min-w-0 relative">
                {/* Connector line */}
                {idx < TIMELINE_CHECKPOINTS.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      isCompleted ? "bg-green-400" : "bg-gray-200"
                    }`}
                  />
                )}
                {/* Circle */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {idx + 1}
                </div>
                <p className="mt-2 text-center text-xs text-gray-500 leading-tight px-1">
                  {cp.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase progress */}
      <div className="space-y-3">
        {phaseGroups.map((group) => {
          const total = group.milestones.length;
          const completed = group.milestones.filter((m) => m.status === "Completed").length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          return (
            <div key={group.phase} className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800">
                  Phase {group.phase} — {group.label}
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant={pct === 100 ? "on-time" : pct > 0 ? "in-progress" : "pending"}>
                    {pct === 100 ? "Completed" : pct > 0 ? "In Progress" : "Not Started"}
                  </Badge>
                  <span className="text-sm text-gray-500">{pct}%</span>
                </div>
              </div>
              <Progress value={pct} className="h-2 mb-4" />
              {total > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-left text-xs font-medium text-gray-500">Milestone</th>
                      <th className="py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="py-2 text-left text-xs font-medium text-gray-500">Due Date</th>
                      <th className="py-2 text-left text-xs font-medium text-gray-500">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.milestones.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 text-gray-800">
                          {m.milestoneActivity?.label ?? "Milestone"}
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={
                              m.status === "Completed"
                                ? "on-time"
                                : m.status === "InProgress"
                                ? "in-progress"
                                : "pending"
                            }
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-gray-500">
                          {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2 text-gray-500">
                          {m.completedDate
                            ? new Date(m.completedDate).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No milestones configured for this phase yet.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
