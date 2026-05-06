import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { financeNotificationEmail, capexIdGeneratedEmail } from "@/lib/email/templates";

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
  const fa = await db.capexFinanceApproval.findUnique({
    where: { capExRequestId: capexId },
    include: {
      rcFinanceApprover: { select: { id: true, name: true } },
      rcFinanceApprovedBy: { select: { id: true, name: true } },
      vpFinanceApprover: { select: { id: true, name: true } },
      vpFinanceApprovedBy: { select: { id: true, name: true } },
    },
  });
  return Response.json(fa ?? null);
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
    return Response.json({ error: "No CapEx request found" }, { status: 404 });
  }

  // Check existing record so we can detect first-time submission and new CapEx ID
  const existing = await db.capexFinanceApproval.findUnique({
    where: { capExRequestId: capexId },
    select: { projectCapex: true, isBudget: true },
  });

  const fa = await db.capexFinanceApproval.upsert({
    where: { capExRequestId: capexId },
    create: { capExRequestId: capexId, createdBy: userId, ...body },
    update: { updatedBy: userId, ...body },
  });

  const project = await db.project.findUnique({
    where: { id: params.prjId },
    select: { name: true, prjNumber: true },
  });

  // Finance notification — fires once when budget decision first submitted
  if (body.isBudget !== undefined && existing?.isBudget === undefined && project) {
    const financeLeads = await db.user
      .findMany({
        where: {
          isActive: true,
          userRoles: { some: { role: { name: "Finance Lead" } } },
        },
        select: { email: true },
      })
      .then((u) => u.map((x) => x.email));

    if (financeLeads.length > 0) {
      sendEmail(
        financeNotificationEmail({
          to: financeLeads,
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId: params.prjId,
          isBudget: !!body.isBudget,
          explanation: body.explanation ?? undefined,
        })
      ).catch(() => {});
    }
  }

  // CapEx ID generated — fires once when projectCapex is first set
  if (body.projectCapex && !existing?.projectCapex && project) {
    // Notify Project Manager + IT Manager + Facilities Manager
    const recipients = await db.user
      .findMany({
        where: {
          isActive: true,
          userRoles: {
            some: { role: { name: { in: ["IT Manager", "Facilities Manager"] } } },
          },
        },
        select: { email: true },
      })
      .then((u) => u.map((x) => x.email));

    const pmEmail = await db.capexRequest
      .findUnique({
        where: { id: capexId },
        include: { projectManager: { select: { email: true } } },
      })
      .then((c) => c?.projectManager?.email ?? null);

    const combined = (pmEmail ? [pmEmail] : []).concat(recipients);
    const allRecipients = combined.filter((v, i) => combined.indexOf(v) === i);
    if (allRecipients.length > 0) {
      sendEmail(
        capexIdGeneratedEmail({
          to: allRecipients,
          capexId: body.projectCapex as string,
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId: params.prjId,
        })
      ).catch(() => {});
    }
  }

  return Response.json(fa);
}
