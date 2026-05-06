import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { leadershipApprovalEmail } from "@/lib/email/templates";

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
  const sd = await db.capexSectionDetails.findUnique({
    where: { capExRequestId: capexId },
    include: {
      infraLeadApprover: { select: { id: true, name: true } },
      eusLeadApprover: { select: { id: true, name: true } },
      capLaborLeadApprover: { select: { id: true, name: true } },
      facilitiesLeadApprover: { select: { id: true, name: true } },
      securityLeadApprover: { select: { id: true, name: true } },
    },
  });
  return Response.json(sd ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { prjId: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const body = await req.json();
  const { section, ...data } = body;

  let capexId = await getCapexId(params.prjId);
  if (!capexId) {
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

  // Add section-specific timestamps and createdBy
  const now = new Date();
  const sectionMeta: Record<string, object> = {
    it: { itUpdatedBy: userId, itUpdatedOn: now },
    facilities: { facilitiesUpdatedOn: now },
    security: { securityUpdatedBy: userId, securityUpdatedOn: now },
  };

  const sd = await db.capexSectionDetails.upsert({
    where: { capExRequestId: capexId },
    create: {
      capExRequestId: capexId,
      hCreatedBy: userId,
      hCreatedOn: now,
      ...data,
      ...(section && sectionMeta[section]),
    },
    update: {
      hUpdatedBy: userId,
      hUpdatedOn: now,
      ...data,
      ...(section && sectionMeta[section]),
    },
  });

  // Send leadership approval email when a section is submitted
  const sessionStatusKey: Record<string, string> = {
    it: "itSessionStatus",
    facilities: "facilitiesSessionStatus",
    security: "securitySessionStatus",
  };
  const sectionLabel: Record<string, "IT" | "Facilities" | "Security"> = {
    it: "IT",
    facilities: "Facilities",
    security: "Security",
  };
  const leadershipRole: Record<string, string> = {
    it: "IT Leadership",
    facilities: "Facilities Leadership",
    security: "Security Leadership",
  };

  if (section && data[sessionStatusKey[section]] === "Submitted") {
    const project = await db.project.findUnique({
      where: { id: params.prjId },
      select: { name: true, prjNumber: true },
    });
    const currentUser = userId
      ? await db.user.findUnique({ where: { id: userId }, select: { name: true } })
      : null;

    const leaderEmails = await db.user
      .findMany({
        where: {
          isActive: true,
          userRoles: { some: { role: { name: leadershipRole[section] } } },
        },
        select: { email: true },
      })
      .then((users) => users.map((u) => u.email));

    if (leaderEmails.length > 0 && project) {
      sendEmail(
        leadershipApprovalEmail({
          to: leaderEmails,
          section: sectionLabel[section],
          projectName: project.name,
          projectNumber: project.prjNumber,
          submittedBy: currentUser?.name ?? "System",
          prjId: params.prjId,
        })
      ).catch(() => {});
    }
  }

  return Response.json(sd);
}
