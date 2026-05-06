import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Status } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { capexSubmittedEmail } from "@/lib/email/templates";

async function getCapexForProject(prjId: string) {
  return db.capexRequest.findFirst({
    where: { projectId: prjId, isActive: true },
    include: {
      businessSponsor: { select: { id: true, name: true, email: true } },
      businessRequester: { select: { id: true, name: true, email: true } },
      projectManager: { select: { id: true, name: true, email: true } },
      capexClassification: true,
      capexSubClassification: true,
      projectType: true,
      businessPm: true,
      sectionDetails: {
        include: {
          infraLeadApprover: { select: { id: true, name: true } },
          eusLeadApprover: { select: { id: true, name: true } },
          capLaborLeadApprover: { select: { id: true, name: true } },
          facilitiesLeadApprover: { select: { id: true, name: true } },
          securityLeadApprover: { select: { id: true, name: true } },
        },
      },
      financeApproval: {
        include: {
          rcFinanceApprover: { select: { id: true, name: true } },
          vpFinanceApprover: { select: { id: true, name: true } },
        },
      },
      ecMembers: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { lastModifyDate: "desc" },
      },
      amendments: {
        include: { leadApprover: { select: { id: true, name: true } } },
        orderBy: { createdOn: "desc" },
      },
      relatedCapex: { orderBy: { createdDate: "desc" } },
      attachments: true,
    },
    orderBy: { createdOn: "desc" },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const capex = await getCapexForProject(params.prjId);
  return Response.json(capex ?? null);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const body = await req.json();

  const existing = await db.capexRequest.findFirst({
    where: { projectId: params.prjId, isActive: true },
  });
  if (existing) {
    return Response.json({ error: "CapEx request already exists" }, { status: 409 });
  }

  const capex = await db.capexRequest.create({
    data: {
      projectId: params.prjId,
      projectManagerId: userId,
      state: Status.Draft,
      requestStatus: Status.Draft,
      createdBy: userId,
      ...body,
    },
  });

  return Response.json(capex, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const body = await req.json();

  const existing = await db.capexRequest.findFirst({
    where: { projectId: params.prjId, isActive: true },
  });

  if (!existing) {
    // Auto-create on first save
    const capex = await db.capexRequest.create({
      data: {
        projectId: params.prjId,
        projectManagerId: userId,
        state: Status.Draft,
        requestStatus: Status.Draft,
        createdBy: userId,
        updatedBy: userId,
        ...body,
      },
    });
    return Response.json(capex);
  }

  const { state: newState, ...rest } = body;

  const capex = await db.capexRequest.update({
    where: { id: existing.id },
    data: {
      ...rest,
      updatedBy: userId,
      ...(newState && { state: newState as Status, requestStatus: newState as Status }),
      ...(newState === "Submitted" && { finalStatusDate: new Date() }),
    },
    include: {
      businessRequester: { select: { name: true } },
      project: { select: { name: true, prjNumber: true } },
    },
  });

  // Notify Business PM when CapEx form is submitted
  if (newState === "Submitted" && rest.tempBusinessPmEmail) {
    const projectName = (capex as any).project?.name ?? "";
    const projectNumber = (capex as any).project?.prjNumber ?? "";
    const requesterName = (capex as any).businessRequester?.name ?? "Requestor";
    sendEmail(
      capexSubmittedEmail({
        to: rest.tempBusinessPmEmail as string,
        businessPmName: rest.tempBusinessPmEmail as string,
        projectName,
        projectNumber,
        requesterName,
        prjId: params.prjId,
      })
    ).catch(() => {});
  }

  return Response.json(capex);
}
