import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { Status } from "@prisma/client";

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
