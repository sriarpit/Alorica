import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { functionalAssignmentEmail } from "@/lib/email/templates";

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
  if (!capexId) return Response.json(null);
  const bpm = await db.capexRequestBusinessPm.findUnique({
    where: { capExRequestId: capexId },
  });
  return Response.json(bpm ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const body = await req.json();

  let capexId = await getCapexId(params.prjId);
  if (!capexId) {
    // Create parent capex request first
    const capex = await db.capexRequest.create({
      data: {
        projectId: params.prjId,
        projectManagerId: userId,
        state: "Draft",
        requestStatus: "Draft",
        createdBy: userId,
      },
    });
    capexId = capex.id;
  }

  // Detect newly assigned PMs to notify them
  const prev = await db.capexRequestBusinessPm.findUnique({
    where: { capExRequestId: capexId },
    select: { itPmId: true, facilitiesPmId: true, physicalSecurityPmId: true },
  });

  const bpm = await db.capexRequestBusinessPm.upsert({
    where: { capExRequestId: capexId },
    create: { capExRequestId: capexId, ...body },
    update: body,
  });

  const project = await db.project.findUnique({
    where: { id: params.prjId },
    select: { name: true, prjNumber: true },
  });

  if (project) {
    const assignments: { userId: string; section: "IT" | "Facilities" | "Security" }[] = [];
    if (body.itPmId && body.itPmId !== prev?.itPmId)
      assignments.push({ userId: body.itPmId, section: "IT" });
    if (body.facilitiesPmId && body.facilitiesPmId !== prev?.facilitiesPmId)
      assignments.push({ userId: body.facilitiesPmId, section: "Facilities" });
    if (body.physicalSecurityPmId && body.physicalSecurityPmId !== prev?.physicalSecurityPmId)
      assignments.push({ userId: body.physicalSecurityPmId, section: "Security" });

    for (const a of assignments) {
      const user = await db.user.findUnique({
        where: { id: a.userId },
        select: { name: true, email: true },
      });
      if (user?.email) {
        sendEmail(
          functionalAssignmentEmail({
            to: user.email,
            recipientName: user.name,
            section: a.section,
            projectName: project.name,
            projectNumber: project.prjNumber,
            prjId: params.prjId,
          })
        ).catch(() => {});
      }
    }
  }

  return Response.json(bpm);
}
