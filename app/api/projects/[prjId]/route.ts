import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const session = await auth();
  const roles = ((session?.user as any)?.roles as string[]) ?? [];

  if (!roles.includes("Governance Manager")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    return Response.json({ error: "isActive must be boolean" }, { status: 400 });
  }

  const project = await db.project.update({
    where: { id: params.prjId },
    data: { isActive },
    select: { id: true, isActive: true },
  });

  return Response.json(project);
}
