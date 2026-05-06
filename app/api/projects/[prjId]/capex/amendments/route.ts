import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getCapexId(prjId: string) {
  const c = await db.capexRequest.findFirst({
    where: { projectId: prjId, isActive: true },
    select: { id: true },
  });
  return c?.id ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const capexId = await getCapexId(params.prjId);
  if (!capexId) return Response.json([]);
  const amendments = await db.amendment.findMany({
    where: { capExRequestId: capexId },
    include: { leadApprover: { select: { id: true, name: true } } },
    orderBy: { createdOn: "desc" },
  });
  return Response.json(amendments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const body = await req.json();

  let capexId = await getCapexId(params.prjId);
  if (!capexId) {
    return Response.json({ error: "No CapEx request found" }, { status: 404 });
  }

  const amendment = await db.amendment.create({
    data: {
      capExRequestId: capexId,
      createdBy: userId,
      status: "Pending",
      ...body,
    },
    include: { leadApprover: { select: { id: true, name: true } } },
  });

  return Response.json(amendment, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params: _params }: { params: { prjId: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const amendment = await db.amendment.update({
    where: { id },
    data: { ...data, updatedBy: userId },
    include: { leadApprover: { select: { id: true, name: true } } },
  });

  return Response.json(amendment);
}

export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: { prjId: string } }
) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  await db.amendment.delete({ where: { id } });
  return Response.json({ ok: true });
}
