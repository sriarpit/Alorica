import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { financeNotificationEmail, capexIdGeneratedEmail, financeApproverAssignedEmail } from "@/lib/email/templates";
import { autoCompleteMilestone } from "@/lib/milestones";

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
    select: {
      projectCapex: true,
      isBudget: true,
      regCorpFinanceApproverId: true,
      vpFinanceApproverId: true,
    },
  });

  // Parse ISO date strings to Date objects
  const dateFields = ["regCorpApproverDate", "vpApprovedDate"];
  for (const field of dateFields) {
    if (body[field] !== undefined) {
      body[field] = body[field] ? new Date(body[field] as string) : null;
    }
  }

  const fa = await db.capexFinanceApproval.upsert({
    where: { capExRequestId: capexId },
    create: { capExRequestId: capexId, createdBy: userId, ...body },
    update: { updatedBy: userId, ...body },
  });

  const project = await db.project.findUnique({
    where: { id: params.prjId },
    select: { name: true, prjNumber: true },
  });

  // Email #8 — RC Finance Approver newly assigned
  if (body.regCorpFinanceApproverId && body.regCorpFinanceApproverId !== existing?.regCorpFinanceApproverId && project) {
    const rcApprover = await db.user.findUnique({
      where: { id: body.regCorpFinanceApproverId as string },
      select: { name: true, email: true },
    });
    const bpm = await db.capexRequestBusinessPm.findUnique({
      where: { capExRequestId: capexId },
      select: { itPmId: true },
    });
    const bpmCcEmail = bpm?.itPmId
      ? (await db.user.findUnique({ where: { id: bpm.itPmId }, select: { email: true } }))?.email
      : undefined;
    if (rcApprover?.email) {
      sendEmail(
        financeApproverAssignedEmail({
          to: rcApprover.email,
          cc: bpmCcEmail ?? undefined,
          approverName: rcApprover.name,
          role: "RC Finance Approver",
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId: params.prjId,
        })
      ).catch(() => {});
    }
  }

  // Email #9 — VP Finance Approver newly assigned
  if (body.vpFinanceApproverId && body.vpFinanceApproverId !== existing?.vpFinanceApproverId && project) {
    const vpApprover = await db.user.findUnique({
      where: { id: body.vpFinanceApproverId as string },
      select: { name: true, email: true },
    });
    const bpm = await db.capexRequestBusinessPm.findUnique({
      where: { capExRequestId: capexId },
      select: { itPmId: true },
    });
    const bpmCcEmail = bpm?.itPmId
      ? (await db.user.findUnique({ where: { id: bpm.itPmId }, select: { email: true } }))?.email
      : undefined;
    if (vpApprover?.email) {
      sendEmail(
        financeApproverAssignedEmail({
          to: vpApprover.email,
          cc: bpmCcEmail ?? undefined,
          approverName: vpApprover.name,
          role: "VP Finance Approver",
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId: params.prjId,
        })
      ).catch(() => {});
    }
  }

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

  // Auto-complete system milestones based on approval events
  if (body.regionalApprovalStatusId === "Approved" || body.statusRC === "Approved") {
    await autoCompleteMilestone(capexId, params.prjId, "Finance Approval Initiated", userId);
  }
  if (body.vpFinanceApprovalStatusId === "Approved" || body.statusVP === "Approved") {
    await autoCompleteMilestone(capexId, params.prjId, "VP Finance Approval", userId);
  }
  if (body.projectCapex && !existing?.projectCapex) {
    await autoCompleteMilestone(capexId, params.prjId, "CAPEX ID Generated", userId);
  }

  // Email #11 — CapEx ID generated — fires once when projectCapex is first set
  if (body.projectCapex && !existing?.projectCapex && project) {
    const [functionalLeaders, capexReq] = await Promise.all([
      db.user.findMany({
        where: {
          isActive: true,
          userRoles: { some: { role: { name: { in: ["IT Manager", "Facilities Manager", "Security Manager"] } } } },
        },
        select: { email: true },
      }),
      db.capexRequest.findUnique({
        where: { id: capexId },
        include: {
          projectManager: { select: { email: true } },
          businessRequester: { select: { email: true } },
          businessPm: { select: { itPmId: true } },
          relatedCapex: { select: { capExNo: true } },
        },
      }),
    ]);

    const bpmItPmEmail = capexReq?.businessPm?.itPmId
      ? (await db.user.findUnique({ where: { id: capexReq.businessPm.itPmId }, select: { email: true } }))?.email
      : undefined;

    const toEmails: string[] = [];
    if (capexReq?.businessRequester?.email) toEmails.push(capexReq.businessRequester.email);
    if (bpmItPmEmail)                       toEmails.push(bpmItPmEmail);
    if (capexReq?.projectManager?.email)    toEmails.push(capexReq.projectManager.email);
    functionalLeaders.forEach((u) => { if (u.email) toEmails.push(u.email); });
    const allRecipients = Array.from(new Set(toEmails));

    if (allRecipients.length > 0) {
      sendEmail(
        capexIdGeneratedEmail({
          to: allRecipients,
          capexId: body.projectCapex as string,
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId: params.prjId,
          generatedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          relatedCapexIds: capexReq?.relatedCapex?.map((r) => r.capExNo).filter((id): id is string => id !== null) ?? [],
        })
      ).catch(() => {});
    }
  }

  return Response.json(fa);
}
