"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search, FileText, MapPin, Users, ChevronLeft, ChevronRight,
  X, ChevronUp, ChevronDown, ChevronsUpDown, LayoutList,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

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
  isActive: boolean;
}

interface ProjectsClientProps {
  projects: ProjectRowData[];
  assignedProjectIds: string[];
  currentUserId: string;
  userRoles: string[];
  locationHierarchy: Record<string, Record<string, string[]>>;
}

type SortKey = "prjNumber" | "name" | "projectManager" | "capexState" | "goLiveDate";
type SortDir = "asc" | "desc";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  InProgress: "In Progress", Completed: "Completed", Pending: "Pending",
  Delayed: "Delayed", Active: "Active", Draft: "Draft", Submitted: "Submitted",
  Approved: "Approved", Rejected: "Rejected", WorkinProgress: "Work in Progress",
};

function statusVariant(state: string): string {
  const s = state.toLowerCase().replace(/\s/g, "");
  if (s === "inprogress" || s === "workinprogress" || s === "submitted") return "in-progress";
  if (s === "completed" || s === "approved") return "completed";
  if (s === "rejected" || s === "delayed") return "delayed";
  return "pending";
}

function dedup(arr: string[]): string[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i).sort();
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ── Component ────────────────────────────────────────────────────────────────

export function ProjectsClient({
  projects,
  assignedProjectIds: assignedArr,
  userRoles,
  locationHierarchy,
}: ProjectsClientProps) {
  const assignedSet = useMemo(() => new Set(assignedArr), [assignedArr]);

  const isGovernanceManager = userRoles.includes("Governance Manager");
  const isITUser = userRoles.includes("IT User");
  const isFacilityUser = userRoles.includes("Facilities User");
  const showCapEx = !isITUser && !isFacilityUser;
  const showActiveCol = isGovernanceManager;

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [classification, setClassification] = useState("");
  const [status, setStatus] = useState("");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("prjNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Local active-state overrides (optimistic UI)
  const [activeOverrides, setActiveOverrides] = useState<Record<string, boolean>>({});

  // ── Cascading dropdown options ────────────────────────────────────────────
  const regionOptions = Object.keys(locationHierarchy).sort();

  const countryOptions = region
    ? Object.keys(locationHierarchy[region] ?? {}).sort()
    : dedup(Object.values(locationHierarchy).flatMap((c) => Object.keys(c)));

  const locationOptions = country
    ? region
      ? (locationHierarchy[region]?.[country] ?? []).slice().sort()
      : dedup(Object.values(locationHierarchy).flatMap((c) => c[country] ?? []))
    : region
    ? dedup(Object.values(locationHierarchy[region] ?? {}).flat())
    : dedup(Object.values(locationHierarchy).flatMap((c) => Object.values(c)).flat());

  const classificationOptions = ["Growth", "Maintenance", "Technology", "Relocation"];
  const statusOptions = [
    { value: "InProgress", label: "In Progress" },
    { value: "Pending", label: "Pending" },
    { value: "Completed", label: "Completed" },
  ];

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      if (assignedOnly && !assignedSet.has(p.id)) return false;
      if (region && p.region !== region) return false;
      if (country && p.country !== country) return false;
      if (location && p.location !== location) return false;
      if (classification && p.classification !== classification) return false;
      if (status && p.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.prjNumber.toLowerCase().includes(q) &&
          !(p.projectManager?.name ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortKey === "prjNumber") { av = a.prjNumber; bv = b.prjNumber; }
      else if (sortKey === "name") { av = a.name; bv = b.name; }
      else if (sortKey === "projectManager") { av = a.projectManager?.name ?? ""; bv = b.projectManager?.name ?? ""; }
      else if (sortKey === "capexState") { av = a.capexState; bv = b.capexState; }
      else if (sortKey === "goLiveDate") { av = a.goLiveDate ?? ""; bv = b.goLiveDate ?? ""; }
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [projects, search, region, country, location, classification, status, assignedOnly, assignedSet, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filtered.length);

  const hasFilters = search || region || country || location || classification || status || assignedOnly;

  function clearFilters() {
    setSearch(""); setRegion(""); setCountry(""); setLocation("");
    setClassification(""); setStatus(""); setAssignedOnly(false); setPage(1);
  }

  function handleRegion(v: string) { setRegion(v === "_all" ? "" : v); setCountry(""); setLocation(""); setPage(1); }
  function handleCountry(v: string) { setCountry(v === "_all" ? "" : v); setLocation(""); setPage(1); }
  function handleLocation(v: string) { setLocation(v === "_all" ? "" : v); setPage(1); }
  function handleClassification(v: string) { setClassification(v === "_all" ? "" : v); setPage(1); }
  function handleStatus(v: string) { setStatus(v === "_all" ? "" : v); setPage(1); }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  // ── Active toggle (Governance Manager only) ───────────────────────────────
  const toggleActive = useCallback(async (projectId: string, current: boolean) => {
    const next = !current;
    setActiveOverrides((prev) => ({ ...prev, [projectId]: next }));
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
    } catch {
      // revert on failure
      setActiveOverrides((prev) => ({ ...prev, [projectId]: current }));
    }
  }, []);

  // ── Sort icon ─────────────────────────────────────────────────────────────
  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 text-gray-400 ml-1 inline" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-[#0f1e35] ml-1 inline" />
      : <ChevronDown className="h-3 w-3 text-[#0f1e35] ml-1 inline" />;
  }

  function SortTh({ col, children, className }: { col: SortKey; children: React.ReactNode; className?: string }) {
    return (
      <th
        className={cn(
          "px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors",
          className
        )}
        onClick={() => handleSort(col)}
      >
        {children}
        <SortIcon col={col} />
      </th>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
        <Button
          variant={assignedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => { setAssignedOnly((v) => !v); setPage(1); }}
          className={cn(
            "gap-2 text-sm",
            assignedOnly ? "bg-[#0f1e35] text-white hover:bg-[#1a2f4f]" : "text-gray-600"
          )}
        >
          <Users className="h-4 w-4" />
          Assign To Me
          {assignedOnly && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-medium">
              {projects.filter((p) => assignedSet.has(p.id)).length}
            </span>
          )}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-3">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by project name or PRJ number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Region */}
        <Select value={region} onValueChange={handleRegion}>
          <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Regions</SelectItem>
            {regionOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Country — cascades from region */}
        <Select value={country} onValueChange={handleCountry}>
          <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Countries</SelectItem>
            {countryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Location — cascades from country */}
        <Select value={location} onValueChange={handleLocation}>
          <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Locations</SelectItem>
            {locationOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Classification */}
        <Select value={classification} onValueChange={handleClassification}>
          <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="Classification" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Classifications</SelectItem>
            {classificationOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={status} onValueChange={handleStatus}>
          <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}
            className="h-9 text-sm text-gray-500 hover:text-gray-800 gap-1.5">
            <X className="h-3.5 w-3.5" />Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-24 whitespace-nowrap">
                  Action
                </th>
                <SortTh col="prjNumber">PRJ Number</SortTh>
                <SortTh col="name">Project Name</SortTh>
                <SortTh col="projectManager">Project Manager</SortTh>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                  Business Sponsor
                </th>
                <SortTh col="capexState">State</SortTh>
                <SortTh col="goLiveDate">Go-Live Date</SortTh>
                {showActiveCol && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Active
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={showActiveCol ? 8 : 7} className="px-4 py-16 text-center text-gray-400">
                    <LayoutList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {hasFilters
                      ? "No projects match the current filters."
                      : "No projects found. Projects are synced from ServiceNow."}
                  </td>
                </tr>
              ) : (
                paginated.map((project) => {
                  const isAssigned = assignedSet.has(project.id);
                  const currentActive = activeOverrides[project.id] ?? project.isActive;

                  return (
                    <tr
                      key={project.id}
                      className={cn(
                        "transition-colors",
                        !currentActive
                          ? "opacity-50 bg-gray-50"
                          : isAssigned
                          ? "bg-blue-50/30 hover:bg-blue-50/60"
                          : "hover:bg-gray-50"
                      )}
                    >
                      {/* Action buttons */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link href={`/milestone-tracking/${project.id}`}>
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs gap-1 border-gray-300 hover:border-[#0f1e35] hover:text-[#0f1e35]">
                              <MapPin className="h-3 w-3" />
                              Milestones
                            </Button>
                          </Link>
                          {showCapEx && (
                            <Link href={`/projects/${project.id}/capex/request-details`}>
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs gap-1 border-gray-300 hover:border-[#0f1e35] hover:text-[#0f1e35]">
                                <FileText className="h-3 w-3" />
                                CapEx Form
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* PRJ Number */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                          {project.prjNumber}
                        </span>
                      </td>

                      {/* Project Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{project.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {project.location && (
                            <span className="text-xs text-gray-400">{project.location}</span>
                          )}
                          {isAssigned && (
                            <span className="text-xs text-blue-600 font-medium">• Assigned</span>
                          )}
                        </div>
                      </td>

                      {/* Project Manager */}
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {project.projectManager?.name ?? "—"}
                      </td>

                      {/* Business Sponsor */}
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {project.businessOwner?.name ?? "—"}
                      </td>

                      {/* State */}
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(project.capexState) as any}>
                          {STATUS_LABELS[project.capexState] ?? project.capexState}
                        </Badge>
                      </td>

                      {/* Go-Live Date */}
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {project.goLiveDate
                          ? new Date(project.goLiveDate).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Active toggle — Governance Manager only */}
                      {showActiveCol && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(project.id, currentActive)}
                            className={cn(
                              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f1e35] focus:ring-offset-1",
                              currentActive ? "bg-[#0f1e35]" : "bg-gray-300"
                            )}
                            title={currentActive ? "Mark Inactive" : "Mark Active"}
                          >
                            <span
                              className={cn(
                                "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                                currentActive ? "translate-x-4" : "translate-x-1"
                              )}
                            />
                          </button>
                        </td>
                      )}
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
            <span>{startItem}–{endItem} of {filtered.length} items</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Rows:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="px-1 text-gray-400 text-xs">…</span>
                ) : (
                  <Button key={p} variant={p === currentPage ? "default" : "outline"} size="sm"
                    className={cn("h-7 w-7 p-0 text-xs", p === currentPage && "bg-[#0f1e35] text-white hover:bg-[#1a2f4f]")}
                    onClick={() => setPage(p as number)}>
                    {p}
                  </Button>
                )
              )}

            <Button variant="outline" size="sm" className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
