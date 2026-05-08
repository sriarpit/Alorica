import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { projectCreatedEmail } from "@/lib/email/templates";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");
  const country = searchParams.get("country");
  const location = searchParams.get("location");
  const classification = searchParams.get("classification");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const projects = await db.project.findMany({
    where: {
      ...(region && { region }),
      ...(country && { country }),
      ...(location && { location }),
      ...(classification && { classification }),
      ...(status && { status: status as Status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { prjNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      projectManager: { select: { id: true, name: true } },
      businessOwner: { select: { id: true, name: true } },
      capexRequests: {
        take: 1,
        orderBy: { createdOn: "desc" },
        select: { id: true, state: true, requestStatus: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(projects);
}

// Called by ServiceNow sync or admin import to upsert a project
export async function POST(request: NextRequest) {
  const body = await request.json();

  const project = await db.project.upsert({
    where: { prjNumber: body.prjNumber },
    update: body,
    create: body,
    include: {
      projectManager: { select: { email: true, name: true } },
      businessOwner: { select: { email: true, name: true } },
    },
  });

  // Email #1 — send when project status becomes WorkInProgress
  if (body.status === "WorkinProgress" && project.businessOwner?.email) {
    sendEmail(
      projectCreatedEmail({
        to: project.businessOwner.email,
        cc: project.projectManager?.email ?? undefined,
        requesterName: project.businessOwner.name,
        projectNumber: project.prjNumber,
        projectName: project.name,
        requestDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        currentStatus: "Work In Progress",
        prjId: project.id,
      })
    ).catch(() => {});
  }

  return Response.json(project, { status: 201 });
}
