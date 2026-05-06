import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Roles that cannot access the CapEx form sections at all
const CAPEX_BLOCKED_ROLES = new Set(["IT User", "Facilities User"]);

// Only Admin role can access /admin routes
const ADMIN_ROLES = new Set(["Admin", "Governance Manager"]);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public paths — no auth required
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/ec/") ||
    pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isLoggedIn) return NextResponse.next();

  const roles: string[] = (req.auth as any)?.user?.roles ?? [];

  // /admin/** — restricted to Admin and Governance Manager
  if (pathname.startsWith("/admin")) {
    const canAccess = roles.some((r) => ADMIN_ROLES.has(r));
    if (!canAccess) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // /projects/[id]/capex/** — blocked for IT User and Facilities User
  if (pathname.match(/\/projects\/[^/]+\/capex/)) {
    const isBlocked = roles.some((r) => CAPEX_BLOCKED_ROLES.has(r));
    if (isBlocked) {
      // Redirect to the project's milestones page
      const match = pathname.match(/\/projects\/([^/]+)\//);
      const prjId = match?.[1];
      const target = prjId
        ? `/projects/${prjId}/milestones/phase-2`
        : "/projects";
      return NextResponse.redirect(new URL(target, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
