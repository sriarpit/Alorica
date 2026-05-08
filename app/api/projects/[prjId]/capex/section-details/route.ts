import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { leadershipApprovalEmail, leadApproverNotificationEmail, allSectionsApprovedEmail } from "@/lib/email/templates";
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
  const { section, documentSummary, ...data } = body;
  // Map form field → DB column name
  if (documentSummary !== undefined) data.itComments = documentSummary;

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

  // Parse date fields sent as ISO strings
  const dateFields = [
    "infrastructureLeadApprovedDate",
    "eusApprovedDate",
    "capitalLaborApprovedDate",
    "facilitiesApprovedDate",
    "securityApprovedDate",
  ];
  for (const field of dateFields) {
    if (data[field] !== undefined) {
      data[field] = data[field] ? new Date(data[field] as string) : null;
    }
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
    const submittedBy = currentUser?.name ?? "System";

    // Fetch Business PM email for CC (BPM stores IDs, not relations)
    const bpmRecord = await db.capexRequestBusinessPm.findUnique({
      where: { capExRequestId: capexId },
      select: { itPmId: true, facilitiesPmId: true, physicalSecurityPmId: true },
    });
    const bpmPmId =
      section === "it" ? bpmRecord?.itPmId
      : section === "facilities" ? bpmRecord?.facilitiesPmId
      : bpmRecord?.physicalSecurityPmId;
    const bpmEmail = bpmPmId
      ? (await db.user.findUnique({ where: { id: bpmPmId }, select: { email: true } }))?.email ?? undefined
      : undefined;

    if (project) {
      // Email #4 IT — targeted lead approvers with amount filter
      if (section === "it") {
        const approverIds: string[] = [];
        const lineItems: { label: string; amount: number }[] = [];
        const infraAmt = Number(data.infrastructureCostTotal) || 0;
        const eusAmt   = Number(data.eusCostTotal) || 0;
        const capAmt   = Number(data.capitalLaborCostTotal) || 0;
        if (infraAmt > 0 && data.infrastructureLeadApproverId) { approverIds.push(data.infrastructureLeadApproverId as string); lineItems.push({ label: "Infrastructure Cost", amount: infraAmt }); }
        if (eusAmt   > 0 && data.eusLeadApproverId)            { approverIds.push(data.eusLeadApproverId as string);            lineItems.push({ label: "EUS Cost",            amount: eusAmt   }); }
        if (capAmt   > 0 && data.capitalLaborLeadApproverId)   { approverIds.push(data.capitalLaborLeadApproverId as string);   lineItems.push({ label: "Capital Labor Cost",  amount: capAmt   }); }

        if (approverIds.length > 0) {
          const approverEmails = await db.user
            .findMany({ where: { id: { in: approverIds } }, select: { email: true } })
            .then((u) => u.map((x) => x.email));
          if (approverEmails.length) {
            sendEmail(leadApproverNotificationEmail({
              to: approverEmails,
              cc: bpmEmail ?? undefined,
              section: "IT",
              projectName: project.name,
              projectNumber: project.prjNumber,
              submittedBy,
              prjId: params.prjId,
              lineItems,
            })).catch(() => {});
          }
        }
      }

      // Email #5 Facilities — one lead approver
      if (section === "facilities" && data.facilitiesLeadApproverId) {
        const approver = await db.user.findUnique({
          where: { id: data.facilitiesLeadApproverId as string },
          select: { email: true },
        });
        if (approver?.email) {
          sendEmail(leadApproverNotificationEmail({
            to: approver.email,
            cc: bpmEmail ?? undefined,
            section: "Facilities",
            projectName: project.name,
            projectNumber: project.prjNumber,
            submittedBy,
            prjId: params.prjId,
          })).catch(() => {});
        }
      }

      // Email #6 Security — one lead approver
      if (section === "security" && data.securityLeadApproverId) {
        const approver = await db.user.findUnique({
          where: { id: data.securityLeadApproverId as string },
          select: { email: true },
        });
        if (approver?.email) {
          sendEmail(leadApproverNotificationEmail({
            to: approver.email,
            cc: bpmEmail ?? undefined,
            section: "Security",
            projectName: project.name,
            projectNumber: project.prjNumber,
            submittedBy,
            prjId: params.prjId,
          })).catch(() => {});
        }
      }

      // Also broadcast to all leadership role users
      const leaderEmails = await db.user
        .findMany({
          where: { isActive: true, userRoles: { some: { role: { name: leadershipRole[section] } } } },
          select: { email: true },
        })
        .then((users) => users.map((u) => u.email));
      if (leaderEmails.length) {
        sendEmail(leadershipApprovalEmail({
          to: leaderEmails,
          section: sectionLabel[section],
          projectName: project.name,
          projectNumber: project.prjNumber,
          submittedBy,
          prjId: params.prjId,
        })).catch(() => {});
      }
    }
  }

  // Check if all selected sections are now approved → trigger Finance Team email
  await checkAndNotifyFinanceTeam(params.prjId, capexId, userId, section, data);

  // Auto-complete ROM milestone when a section reaches ApprovedbyLeadership
  const sectionStatusField: Record<string, string> = {
    it: "infrastructureLeadStatus",
    facilities: "facilitiesStatus",
    security: "securityLeadApproveStatus",
  };
  const sectionRomLabel: Record<string, string> = {
    it: "Approved – IT",
    facilities: "Approved – Facilities",
    security: "Approved – Security",
  };
  if (section && data[sectionStatusField[section]] === "ApprovedbyLeadership") {
    await autoCompleteMilestone(capexId, params.prjId, sectionRomLabel[section], userId);
  }

  return Response.json(sd);
}

async function checkAndNotifyFinanceTeam(
  prjId: string,
  capexId: string,
  userId: string | undefined,
  section: string | undefined,
  data: Record<string, unknown>
) {
  // Only worth checking when a status field is being set to ApprovedbyLeadership
  const statusFields: Record<string, string> = {
    it: "infrastructureLeadStatus",
    facilities: "facilitiesStatus",
    security: "securityLeadApproveStatus",
  };
  if (!section || data[statusFields[section]] !== "ApprovedbyLeadership") return;

  // Get BPM to know which sections were selected
  const bpm = await db.capexRequestBusinessPm.findUnique({
    where: { capExRequestId: capexId },
    select: { isIt: true, isFacilities: true, isPhysicalSecurity: true },
  });
  if (!bpm) return;

  // Re-fetch latest section details to check current approval statuses
  const latest = await db.capexSectionDetails.findUnique({
    where: { capExRequestId: capexId },
    select: {
      infrastructureLeadStatus: true,
      eusStatus: true,
      capitalLaborLeadStatus: true,
      facilitiesStatus: true,
      securityLeadApproveStatus: true,
    },
  });
  if (!latest) return;

  const itApproved =
    !bpm.isIt ||
    latest.infrastructureLeadStatus === "ApprovedbyLeadership" ||
    latest.eusStatus === "ApprovedbyLeadership" ||
    latest.capitalLaborLeadStatus === "ApprovedbyLeadership";
  const facApproved = !bpm.isFacilities || latest.facilitiesStatus === "ApprovedbyLeadership";
  const secApproved =
    !bpm.isPhysicalSecurity || latest.securityLeadApproveStatus === "ApprovedbyLeadership";

  if (!itApproved || !facApproved || !secApproved) return;

  // All required sections approved — send Finance Team email
  const financeEmail = process.env.FINANCE_TEAM_EMAIL;
  if (!financeEmail) return;

  const [project, currentUser] = await Promise.all([
    db.project.findUnique({ where: { id: prjId }, select: { name: true, prjNumber: true } }),
    userId ? db.user.findUnique({ where: { id: userId }, select: { name: true } }) : null,
  ]);
  if (!project) return;

  const approvedSections: string[] = [];
  if (bpm.isIt) approvedSections.push("IT");
  if (bpm.isFacilities) approvedSections.push("Facilities");
  if (bpm.isPhysicalSecurity) approvedSections.push("Physical Security");

  sendEmail(
    allSectionsApprovedEmail({
      to: financeEmail,
      projectName: project.name,
      projectNumber: project.prjNumber,
      prjId,
      approvedSections,
      approvedBy: currentUser?.name ?? "System",
      approvalDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    })
  ).catch(() => {});
}
