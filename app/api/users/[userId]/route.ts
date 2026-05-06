import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const body = await req.json();
  const { name, email, mobilePhone, isActive } = body;

  const user = await db.user.update({
    where: { id: params.userId },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(mobilePhone !== undefined && { mobilePhone }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { userRoles: { include: { role: true } } },
  });

  return Response.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  await db.user.update({
    where: { id: params.userId },
    data: { isActive: false },
  });
  return Response.json({ ok: true });
}
