import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";

// POST body: { roleId: number } — add a role
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { roleId } = await req.json();
  const userRole = await db.userRole.upsert({
    where: { userId_roleId: { userId: params.userId, roleId } },
    create: { userId: params.userId, roleId },
    update: {},
    include: { role: true },
  });
  return Response.json(userRole, { status: 201 });
}

// DELETE ?roleId=N — remove a role
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const roleId = Number(new URL(req.url).searchParams.get("roleId"));
  if (!roleId) return Response.json({ error: "Missing roleId" }, { status: 400 });
  await db.userRole.delete({
    where: { userId_roleId: { userId: params.userId, roleId } },
  });
  return Response.json({ ok: true });
}
