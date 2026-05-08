import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { financeNotificationEmail, capexIdGeneratedEmail, financeApproverAssignedEmail } from "@/lib/email/templates";
import { autoCompleteMilestone, autoStartMilestone } from "@/lib/milestones";
import { generateCapExId } from "@/lib/edl-api/mock";

const EC_THRESHOLD = 25_000;

async function getCapexId(prjId: string) {
  const c = await db.capexRequest.findFirst({
    where: { projectId: prjId, isActive: true },
    select: { id: true },
  });
  return c?.id ?? null;
}

/** Computes grand total from section details (IT + Facilities + Security). */
async function getGrandTotal(capexId: string): Promise<number> {
  const sd = await db.capexSectionDetails.findUnique({
    where: { capExRequestId: capexId },
    select: {
      infrastructureCostTotal: true,
      eusCostTotal: true,
      capitalLaborCostTotal: true,
      construction: true,
      electricalCabling: true,
      furnitureFixture: true,
      others: true,
      tenantImprovementAllowance: true,
      securityTotal: true,
    },
  });
  if (!sd) return 0;
  const n = (v: unknown) => Number(v) || 0;
  return (
    n(sd.infrastructureCostTotal) +
    n(sd.eusCostTotal) +
    n(sd.capitalLaborCostTotal) +
    n(sd.construction) +
    n(sd.electricalCabling) +
    n(sd.furnitureFixture) +
    n(sd.others) +
    n(sd.tenantImprovementAllowance) +
    n(sd.securityTotal)
  );
}

/** Generates CapEx ID, saves to finance record, sends email, completes milestone. */
async function triggerCapExIdGeneration(
  capexId: string,
  prjId: string,
  project: { name: string; prjNumber: string },
  userId?: string
): Promise<string> {
  const capexReq = await db.capexRequest.findUnique({
    where: { id: capexId },
    include: {
      projectManager: { select: { email: true } },
      businessRequester: { select: { email: true } },
      businessPm: { select: { itPmId: true, facilitiesPmId: true } },
      relatedCapex: { select: { capExNo: true } },
    },
  });

  const generatedId = generateCapExId(project.prjNumber);

  // Save to finance record
  await db.capexFinanceApproval.upsert({
    where: { capExRequestId: capexId },
    create: { capExRequestId: capexId, projectCapex: generatedId, createdBy: userId },
    update: { projectCapex: generatedId, updatedBy: userId },
  });

  // Complete the CapEx ID milestone
  await autoCompleteMilestone(capexId, prjId, "CAPEX ID Generated", userId);

  // Build recipient list
  const functionalLeaders = await db.user.findMany({
    where: {
      isActive: true,
      userRoles: { some: { role: { name: { in: ["IT Manager", "Facilities Manager", "Security Manager"] } } } },
    },
    select: { email: true },
  });

  const pmIds = [
    capexReq?.businessPm?.itPmId,
    capexReq?.businessPm?.facilitiesPmId,
  ].filter(Boolean) as string[];
  const pmUsers = pmIds.length
    ? await db.user.findMany({ where: { id: { in: pmIds }, isActive: true }, select: { email: true } })
    : [];

  const toSet = new Set<string>();
  if (capexReq?.businessRequester?.email) toSet.add(capexReq.businessRequester.email);
  if (capexReq?.projectManager?.email) toSet.add(capexReq.projectManager.email);
  pmUsers.forEach((u) => toSet.add(u.email));
  functionalLeaders.forEach((u) => u.email && toSet.add(u.email));

  if (toSet.size > 0) {
    sendEmail(
      capexIdGeneratedEmail({
        to: Array.from(toSet),
        capexId: generatedId,
        projectName: project.name,
        projectNumber: project.prjNumber,
        prjId,
        generatedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        relatedCapexIds: capexReq?.relatedCapex?.map((r) => r.capExNo).filter((id): id is string => id !== null) ?? [],
      })
    ).catch(() => {});
  }

  return generatedId;
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

  const existing = await db.capexFinanceApproval.findUnique({
    where: { capExRequestId: capexId },
    select: {
      projectCapex: true,
      isBudget: true,
      regCorpFinanceApproverId: true,
      vpFinanceApproverId: true,
      regionalApprovalStatusId: true,
      vpFinanceApprovalStatusId: true,
    },
  });

  // Parse ISO date strings
  for (const f of ["regCorpApproverDate", "vpApprovedDate"]) {
    if (body[f] !== undefined) body[f] = body[f] ? new Date(body[f] as string) : null;
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

  // Email — RC Finance Approver newly assigned
  if (body.regCorpFinanceApproverId && body.regCorpFinanceApproverId !== existing?.regCorpFinanceApproverId && project) {
    const rcApprover = await db.user.findUnique({
      where: { id: body.regCorpFinanceApproverId as string },
      select: { name: true, email: true },
    });
    if (rcApprover?.email) {
      sendEmail(
        financeApproverAssignedEmail({
          to: rcApprover.email,
          approverName: rcApprover.name,
          role: "RC Finance Approver",
          projectName: project.name,
          projectNumber: project.prjNumber,
          prjId: params.prjId,
        })
      ).catch(() => {});
    }
  }

  // Email — VP Finance Approver newly assigned
  if (body.vpFinanceApproverId && body.vpFinanceApproverId !== existing?.vpFinanceApproverId && project) {
    const vpApprover = await db.user.findUnique({
      where: { id: body.vpFinanceApproverId as string },
      select: { name: true, email: true },
    });
    if (vpApprover?.email) {
      sendEmail(
        financeApproverAssignedEmail({
          to: vpApprover.email,
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
        where: { isActive: true, userRoles: { some: { role: { name: "Finance Lead" } } } },
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

  // RC Finance Approved → complete "Finance Approval Initiated" milestone
  const rcJustApproved =
    (body.regionalApprovalStatusId === "Approved" || body.statusRC === "Approved") &&
    existing?.regionalApprovalStatusId !== "Approved";
  if (rcJustApproved) {
    await autoCompleteMilestone(capexId, params.prjId, "Finance Approval Initiated", userId);
  }

  // VP Finance Approved → complete "VP Finance Approval" milestone + $25K logic
  const vpJustApproved =
    (body.vpFinanceApprovalStatusId === "Approved" || body.statusVP === "Approved") &&
    existing?.vpFinanceApprovalStatusId !== "Approved";

  if (vpJustApproved && project) {
    await autoCompleteMilestone(capexId, params.prjId, "VP Finance Approval", userId);

    const grandTotal = await getGrandTotal(capexId);

    if (grandTotal <= EC_THRESHOLD) {
      // ≤ $25K: no EC needed — auto-generate CapEx ID immediately
      if (!existing?.projectCapex) {
        await triggerCapExIdGeneration(capexId, params.prjId, project, userId);
      }
    } else {
      // > $25K: activate EC Committee Approval milestone (InProgress)
      await autoStartMilestone(capexId, params.prjId, "EC Committee Approval", userId);
    }
  }

  // Manual CapEx ID set (admin override) — still fires milestone completion + email
  if (body.projectCapex && !existing?.projectCapex && !vpJustApproved) {
    await autoCompleteMilestone(capexId, params.prjId, "CAPEX ID Generated", userId);
    // Full email is handled inline when auto-generated; manual set just completes milestone
  }

  return Response.json(fa);
}
