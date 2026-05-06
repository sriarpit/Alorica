"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TopBarProps {
  userName: string;
  userRole: string;
}

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Executive Dashboard";
  if (pathname.startsWith("/milestone-tracking")) return "Milestone Tracking";
  if (pathname === "/projects") return "Project Requests";
  if (pathname.includes("/capex/request-details")) return "Request Details";
  if (pathname.includes("/capex/types-bpm")) return "CapEx Types & BPM";
  if (pathname.includes("/capex/functional/it")) return "Functional Organization — IT";
  if (pathname.includes("/capex/functional/facilities")) return "Functional Organization — Facilities";
  if (pathname.includes("/capex/functional/security")) return "Functional Organization — Security";
  if (pathname.includes("/capex/total")) return "Total";
  if (pathname.includes("/capex/finance-review")) return "Finance Review / Approvals";
  if (pathname.includes("/capex/amendments")) return "Amendments";
  if (pathname.includes("/milestones/phase-2")) return "Phase 2 | Planning & Approval";
  if (pathname.includes("/milestones/phase-3")) return "Phase 3 | Design & Order";
  if (pathname.includes("/milestones/phase-4")) return "Phase 4 | Implementation / Build-Out";
  if (pathname.includes("/milestones/phase-5")) return "Phase 5 | Site Ready";
  if (pathname === "/admin/users") return "User Management";
  return "Alorica Site Build";
}

export function TopBar({ userName, userRole }: TopBarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="fixed top-0 right-0 left-64 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors relative">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#0f1e35] text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-700 leading-none">{userName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
