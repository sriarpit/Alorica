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
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const capexId = await getCapexId(params.prjId);
  if (!capexId) return Response.json([]);

  const { searchParams } = new URL(req.url);
  const categoryType = searchParams.get("categoryType");

  const where: Record<string, unknown> = { capExRequestId: capexId };
  if (categoryType) where.categoryType = categoryType;

  const comments = await db.comment.findMany({
    where,
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdOn: "desc" },
  });

  return Response.json(
    comments.map((c) => ({
      id: c.id,
      comments: c.comments,
      createdByName: c.createdBy?.name ?? "Unknown",
      createdOn: c.createdOn.toISOString(),
      categoryType: c.categoryType,
      commentsType: c.commentsType,
    }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const capexId = await getCapexId(params.prjId);
  if (!capexId) return Response.json({ error: "CapEx request not found" }, { status: 404 });

  const body = await req.json();
  const { comment, categoryType, commentsType, secondaryId } = body;

  if (!comment?.trim()) {
    return Response.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const created = await db.comment.create({
    data: {
      capExRequestId: capexId,
      comments: comment.trim(),
      createdById: userId ?? null,
      categoryType: categoryType ?? null,
      commentsType: commentsType ?? null,
      secondaryId: secondaryId ?? null,
    },
    include: { createdBy: { select: { name: true } } },
  });

  return Response.json({
    id: created.id,
    comments: created.comments,
    createdByName: created.createdBy?.name ?? "Unknown",
    createdOn: created.createdOn.toISOString(),
  });
}
