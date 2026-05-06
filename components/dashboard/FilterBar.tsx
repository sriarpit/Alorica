"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterState {
  search: string;
  region: string;
  country: string;
  location: string;
  classification: string;
  status: string;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  options: {
    regions: string[];
    countries: string[];
    locations: string[];
    classifications: string[];
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
};

export function FilterBar({ filters, onChange, options }: FilterBarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.region ||
    filters.country ||
    filters.location ||
    filters.classification ||
    filters.status;

  function clearAll() {
    onChange({ search: "", region: "", country: "", location: "", classification: "", status: "" });
  }

  function set(key: keyof FilterState, value: string) {
    // Reset downstream filters when parent filter changes
    if (key === "region") {
      onChange({ ...filters, region: value, country: "", location: "" });
    } else if (key === "country") {
      onChange({ ...filters, country: value, location: "" });
    } else {
      onChange({ ...filters, [key]: value });
    }
  }

  // Filter country options by selected region
  const countryOptions = filters.region
    ? options.countries.filter((c) => {
        // We don't have region→country mapping here, so show all countries unless needed
        return true;
      })
    : options.countries;

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-3 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="Search projects..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Region */}
      <Select value={filters.region} onValueChange={(v) => set("region", v === "_all" ? "" : v)}>
        <SelectTrigger className="h-9 text-sm w-36">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Regions</SelectItem>
          {options.regions.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Country */}
      <Select value={filters.country} onValueChange={(v) => set("country", v === "_all" ? "" : v)}>
        <SelectTrigger className="h-9 text-sm w-36">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Countries</SelectItem>
          {countryOptions.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location */}
      <Select value={filters.location} onValueChange={(v) => set("location", v === "_all" ? "" : v)}>
        <SelectTrigger className="h-9 text-sm w-36">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Locations</SelectItem>
          {options.locations.map((l) => (
            <SelectItem key={l} value={l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Classification */}
      <Select value={filters.classification} onValueChange={(v) => set("classification", v === "_all" ? "" : v)}>
        <SelectTrigger className="h-9 text-sm w-40">
          <SelectValue placeholder="Classification" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Classifications</SelectItem>
          {options.classifications.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={filters.status} onValueChange={(v) => set("status", v === "_all" ? "" : v)}>
        <SelectTrigger className="h-9 text-sm w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Statuses</SelectItem>
          {options.statuses.map((s) => (
            <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear All */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-9 text-sm text-gray-500 hover:text-gray-800 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Clear All
        </Button>
      )}
    </div>
  );
}
