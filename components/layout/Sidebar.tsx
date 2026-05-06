"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  FolderKanban,
  Milestone,
  FileText,
  Building2,
  Shield,
  DollarSign,
  FilePlus,
  ClipboardList,
  LogOut,
  Users,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userName: string;
  userRole: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

function NavLink({
  item,
  depth = 0,
}: {
  item: NavItem;
  depth?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
            depth === 0
              ? "text-gray-300 hover:text-white hover:bg-white/10 font-medium"
              : "text-gray-400 hover:text-white hover:bg-white/10",
            depth > 0 && `pl-${4 + depth * 4}`
          )}
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform shrink-0",
              open ? "rotate-0" : "-rotate-90"
            )}
          />
        </button>
        {open && (
          <div className="mt-0.5">
            {item.children!.map((child) => (
              <NavLink key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
        depth === 0
          ? "text-gray-300 hover:text-white hover:bg-white/10 font-medium"
          : "text-gray-400 hover:text-white hover:bg-white/5",
        isActive && "bg-white/15 text-white",
        depth === 1 && "pl-7",
        depth === 2 && "pl-11",
        depth === 3 && "pl-14"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const params = useParams();
  const pathname = usePathname();
  const prjId = params?.prjId as string | undefined;

  // Determine sidebar state
  const isInsideProject = !!prjId;
  const isMilestoneTracking = pathname.startsWith("/milestone-tracking");

  const defaultNav: NavItem[] = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      children: [
        { label: "Executive", href: "/dashboard" },
        {
          label: "Milestone Tracking",
          href: "/milestone-tracking",
          icon: isMilestoneTracking ? <ChevronRight className="h-3 w-3" /> : undefined,
        },
      ],
    },
    {
      label: "Project Requests",
      href: "/projects",
      icon: <FolderKanban className="h-4 w-4" />,
    },
  ];

  const projectNav: NavItem[] = [
    ...defaultNav,
    {
      label: `Project Management`,
      icon: <Building2 className="h-4 w-4" />,
      children: [
        {
          label: "CapEx Form",
          icon: <FileText className="h-4 w-4" />,
          children: [
            { label: "Request Details", href: `/projects/${prjId}/capex/request-details` },
            { label: "CapEx Types & BPM", href: `/projects/${prjId}/capex/types-bpm` },
            {
              label: "Functional Organization",
              children: [
                { label: "IT", href: `/projects/${prjId}/capex/functional/it` },
                { label: "Facilities", href: `/projects/${prjId}/capex/functional/facilities` },
                { label: "Security", href: `/projects/${prjId}/capex/functional/security` },
                { label: "Total", href: `/projects/${prjId}/capex/total` },
              ],
            },
            { label: "Finance Review/Approvals", href: `/projects/${prjId}/capex/finance-review` },
            { label: "Amendments", href: `/projects/${prjId}/capex/amendments` },
          ],
        },
        {
          label: "Milestone",
          icon: <Milestone className="h-4 w-4" />,
          children: [
            { label: "Phase 2 | Planning & Approval", href: `/projects/${prjId}/milestones/phase-2` },
            { label: "Phase 3 | Design & Order", href: `/projects/${prjId}/milestones/phase-3` },
            { label: "Phase 4 | Implementation/Build...", href: `/projects/${prjId}/milestones/phase-4` },
            { label: "Phase 5 | SiteReady", href: `/projects/${prjId}/milestones/phase-5` },
          ],
        },
      ],
    },
  ];

  const navItems = isInsideProject ? projectNav : defaultNav;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0f1e35]">
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-white font-bold text-sm">
            A
          </div>
          <span className="text-white font-semibold text-lg tracking-wide">ALORICA</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.label} item={item} depth={0} />
        ))}

        {/* Admin link — only for admins */}
        {userRole === "Admin" && (
          <NavLink
            item={{
              label: "Admin",
              href: "/admin/users",
              icon: <Users className="h-4 w-4" />,
            }}
            depth={0}
          />
        )}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{userRole}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-2 p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
