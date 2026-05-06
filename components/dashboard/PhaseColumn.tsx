"use client";

import { ProjectCard, type ProjectCardData } from "./ProjectCard";
import { cn } from "@/lib/utils";

interface PhaseColumnProps {
  phase: {
    key: string;
    label: string;
    color: string;
    dotColor: string;
  };
  projects: ProjectCardData[];
}

export function PhaseColumn({ phase, projects }: PhaseColumnProps) {
  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", phase.dotColor)} />
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider leading-none">
            {phase.label}
          </h3>
        </div>
        <p className="text-xs text-gray-400 pl-4">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
      </div>

      {/* Top colored bar */}
      <div className={cn("h-1 rounded-full mb-3", phase.color)} />

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
        {projects.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-10 text-center">
            <span className="text-xs text-gray-400">No projects</span>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}
