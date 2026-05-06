import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { ecAssignedEmail } from "@/lib/email/templates";

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
  const members = await db.executiveCommitteeMember.findMany({
    where: { capExRequestId: capexId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { lastModifyDate: "desc" },
  });
  return Response.json(members);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const body = await req.json();
  const capexId = await getCapexId(params.prjId);
  if (!capexId) {
    return Response.json({ error: "No CapEx request found" }, { status: 404 });
  }
  const member = await db.executiveCommitteeMember.create({
    data: {
      capExRequestId: capexId,
      userId: body.userId,
      status: "Pending",
      lastModifyDate: new Date(),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Send EC assignment email — fetch capex context in a separate query
  if (member.user?.email && member.token) {
    const capexCtx = await db.capexRequest.findUnique({
      where: { id: capexId },
      include: {
        project: { select: { name: true, prjNumber: true } },
        projectManager: { select: { name: true } },
        sectionDetails: {
          select: {
            infrastructureCostTotal: true,
            eusCostTotal: true,
            capitalLaborCostTotal: true,
            construction: true,
            electricalCabling: true,
            furnitureFixture: true,
            others: true,
            securityTotal: true,
          },
        },
      },
    });

    const sd = capexCtx?.sectionDetails;
    const grandTotal = sd
      ? [
          sd.infrastructureCostTotal,
          sd.eusCostTotal,
          sd.capitalLaborCostTotal,
          sd.construction,
          sd.electricalCabling,
          sd.furnitureFixture,
          sd.others,
          sd.securityTotal,
        ].reduce((sum: number, v: unknown) => sum + (Number(v) || 0), 0)
      : 0;

    sendEmail(
      ecAssignedEmail({
        to: member.user.email,
        memberName: member.user.name,
        projectName: capexCtx?.project?.name ?? "",
        projectNumber: capexCtx?.project?.prjNumber ?? "",
        projectManager: capexCtx?.projectManager?.name ?? "",
        grandTotal,
        token: member.token,
      })
    ).catch(() => {});
  }

  return Response.json(member, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params: _params }: { params: { prjId: string } }
) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const member = await db.executiveCommitteeMember.update({
    where: { id },
    data: { ...data, lastModifyDate: new Date() },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return Response.json(member);
}

export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: { prjId: string } }
) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  await db.executiveCommitteeMember.delete({ where: { id } });
  return Response.json({ ok: true });
}
