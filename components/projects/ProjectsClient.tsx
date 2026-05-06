"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FileText, Milestone, Users, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ProjectRowData {
  id: string;
  prjNumber: string;
  name: string;
  projectManager: { id: string; name: string } | null;
  businessOwner: { id: string; name: string } | null;
  status: string;
  phase: string;
  region: string | null;
  country: string | null;
  location: string | null;
  classification: string | null;
  goLiveDate: string | null;
  capexState: string;
  capexRequestId: string | null;
}

interface ProjectsClientProps {
  projects: ProjectRowData[];
  assignedProjectIds: string[];
  currentUserId: string;
  filterOptions: {
    regions: string[];
    statuses: string[];
  };
}

const STATUS_LABELS: Record<string, string> = {
  InProgress: "In Progress",
  Completed: "Completed",
  Pending: "Pending",
  Delayed: "Delayed",
  Active: "Active",
  Draft: "Draft",
  Submitted: "Submitted",
  Approved: "Approved",
  Rejected: "Rejected",
  WorkinProgress: "Work in Progress",
};

function statusVariant(state: string): string {
  const s = state.toLowerCase().replace(/\s/g, "");
  if (s === "inprogress" || s === "workinprogress") return "in-progress";
  if (s === "completed" || s === "approved") return "completed";
  if (s === "rejected" || s === "delayed") return "delayed";
  if (s === "submitted" || s === "active") return "in-progress";
  return "pending";
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function ProjectsClient({
  projects,
  assignedProjectIds: assignedProjectIdsArr,
  filterOptions,
}: ProjectsClientProps) {
  const assignedProjectIds = useMemo(
    () => new Set(assignedProjectIdsArr),
    [assignedProjectIdsArr]
  );
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (assignedOnly && !assignedProjectIds.has(p.id)) return false;
      if (region && p.region !== region) return false;
      if (status && p.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.prjNumber.toLowerCase().includes(q) &&
          !(p.projectManager?.name ?? "").toLowerCase().includes(q) &&
          !(p.businessOwner?.name ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [projects, search, region, status, assignedOnly, assignedProjectIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasFilters = search || region || status || assignedOnly;

  function clearFilters() {
    setSearch("");
    setRegion("");
    setStatus("");
    setAssignedOnly(false);
    setPage(1);
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v === "_all" ? "" : v);
      setPage(1);
    };
  }

  const startItem = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filtered.length);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Requests</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length === projects.length
              ? `${projects.length} projects`
              : `${filtered.length} of ${projects.length} projects`}
          </p>
        </div>

        {/* Assigned to me toggle */}
        <Button
          variant={assignedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setAssignedOnly((v) => !v);
            setPage(1);
          }}
          className={`gap-2 text-sm ${
            assignedOnly
              ? "bg-[#0f1e35] text-white hover:bg-[#1a2f4f]"
              : "text-gray-600"
          }`}
        >
          <Users className="h-4 w-4" />
          Assigned to me
          {assignedOnly && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-medium">
              {projects.filter((p) => assignedProjectIds.has(p.id)).length}
            </span>
          )}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by name, PRJ#, manager..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Region */}
        <Select value={region} onValueChange={handleFilterChange(setRegion)}>
          <SelectTrigger className="h-9 text-sm w-36">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Regions</SelectItem>
            {filterOptions.regions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={status} onValueChange={handleFilterChange(setStatus)}>
          <SelectTrigger className="h-9 text-sm w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            {filterOptions.statuses.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-sm text-gray-500 hover:text-gray-800 gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-10">#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Project No.</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Project Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Project Manager</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Business Owner</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">State</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Go-Live Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    {hasFilters
                      ? "No projects match the current filters."
                      : "No projects found. Projects are synced from ServiceNow."}
                  </td>
                </tr>
              ) : (
                paginated.map((project, idx) => {
                  const isPending = project.status === "Pending";
                  const isAssigned = assignedProjectIds.has(project.id);
                  const rowNum = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={project.id}
                      className={`transition-colors ${
                        isPending
                          ? "opacity-50 bg-gray-50"
                          : isAssigned
                          ? "bg-blue-50/30 hover:bg-blue-50/50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs">{rowNum}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {project.prjNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{project.name}</span>
                          {isAssigned && (
                            <span className="text-xs text-blue-600 font-medium">• Assigned</span>
                          )}
                        </div>
                        {project.location && (
                          <p className="text-xs text-gray-400 mt-0.5">{project.location}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {project.projectManager?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {project.businessOwner?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(project.capexState) as any}>
                          {STATUS_LABELS[project.capexState] ?? project.capexState}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {project.goLiveDate
                          ? new Date(project.goLiveDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isPending ? (
                          <span className="text-xs text-gray-400 italic">Pending activation</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Link href={`/projects/${project.id}/milestones/phase-2`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-gray-300 hover:border-[#0f1e35] hover:text-[#0f1e35]"
                              >
                                <Milestone className="h-3 w-3" />
                                Milestones
                              </Button>
                            </Link>
                            <Link href={`/projects/${project.id}/capex/request-details`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-gray-300 hover:border-[#0f1e35] hover:text-[#0f1e35]"
                              >
                                <FileText className="h-3 w-3" />
                                CapEx Form
                              </Button>
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-2.5">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              {startItem}–{endItem} of {filtered.length} items
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Rows:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Page number pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1
              )
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="sm"
                    className={`h-7 w-7 p-0 text-xs ${
                      p === currentPage ? "bg-[#0f1e35] text-white hover:bg-[#1a2f4f]" : ""
                    }`}
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}

            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
