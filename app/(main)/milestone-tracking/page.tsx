import { db } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

export default async function MilestoneTrackingPage() {
  const projects = await db.project.findMany({
    include: { projectManager: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Milestone Tracking</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select a project to view its milestone timeline
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <MapPin className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">Projects synced from ServiceNow will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/milestone-tracking/${project.id}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{project.prjNumber}</p>
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
                <div className="text-sm text-gray-500 space-y-1">
                  <p>PM: {project.projectManager?.name ?? "—"}</p>
                  {project.location && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {project.location}, {project.country}
                    </p>
                  )}
                  {project.goLiveDate && (
                    <p>
                      Go-Live:{" "}
                      {new Date(project.goLiveDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
