"use client";

import { useState, useMemo } from "react";
import { FilterBar, type FilterState } from "./FilterBar";
import { PhaseColumn } from "./PhaseColumn";
import type { ProjectCardData } from "./ProjectCard";

const PHASES = [
  {
    key: "Phase1",
    label: "Initiation",
    color: "bg-gray-400",
    dotColor: "bg-gray-400",
  },
  {
    key: "Phase2",
    label: "Planning & Approval",
    color: "bg-blue-500",
    dotColor: "bg-blue-500",
  },
  {
    key: "Phase3",
    label: "Design & Order",
    color: "bg-violet-500",
    dotColor: "bg-violet-500",
  },
  {
    key: "Phase4",
    label: "Implementation",
    color: "bg-orange-500",
    dotColor: "bg-orange-500",
  },
  {
    key: "Phase5",
    label: "Site Ready",
    color: "bg-green-500",
    dotColor: "bg-green-500",
  },
] as const;

interface DashboardClientProps {
  projects: ProjectCardData[];
  filterOptions: {
    regions: string[];
    countries: string[];
    locations: string[];
    classifications: string[];
    statuses: string[];
  };
}

export function DashboardClient({ projects, filterOptions }: DashboardClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    region: "",
    country: "",
    location: "",
    classification: "",
    status: "",
  });

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.prjNumber.toLowerCase().includes(q) &&
          !(p.projectManager?.name ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filters.region && p.region !== filters.region) return false;
      if (filters.country && p.country !== filters.country) return false;
      if (filters.location && p.location !== filters.location) return false;
      if (filters.classification && p.classification !== filters.classification) return false;
      if (filters.status && p.status !== filters.status) return false;
      return true;
    });
  }, [projects, filters]);

  const byPhase = useMemo(
    () =>
      PHASES.map((phase) => ({
        ...phase,
        projects: filtered.filter((p) => p.phase === phase.key),
      })),
    [filtered]
  );

  const totalVisible = filtered.length;
  const totalAll = projects.length;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Executive Data</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalVisible === totalAll
              ? `${totalAll} projects`
              : `${totalVisible} of ${totalAll} projects`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        options={filterOptions}
      />

      {/* Kanban board */}
      <div className="grid grid-cols-5 gap-4 flex-1 min-h-0">
        {byPhase.map((phase) => (
          <PhaseColumn
            key={phase.key}
            phase={phase}
            projects={phase.projects}
          />
        ))}
      </div>
    </div>
  );
}
