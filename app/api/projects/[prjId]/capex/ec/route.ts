import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { ecAssignedEmail, capexIdGeneratedEmail } from "@/lib/email/templates";
import { autoCompleteMilestone } from "@/lib/milestones";
import { generateCapExId } from "@/lib/edl-api/mock";

const EC_THRESHOLD = 25_000;

async function getGrandTotalForCapex(capexId: string): Promise<number> {
  const sd = await db.capexSectionDetails.findUnique({
    where: { capExRequestId: capexId },
    select: {
      infrastructureCostTotal: true, eusCostTotal: true, capitalLaborCostTotal: true,
      construction: true, electricalCabling: true, furnitureFixture: true,
      others: true, tenantImprovementAllowance: true, securityTotal: true,
    },
  });
  if (!sd) return 0;
  const n = (v: unknown) => Number(v) || 0;
  return n(sd.infrastructureCostTotal) + n(sd.eusCostTotal) + n(sd.capitalLaborCostTotal) +
    n(sd.construction) + n(sd.electricalCabling) + n(sd.furnitureFixture) +
    n(sd.others) + n(sd.tenantImprovementAllowance) + n(sd.securityTotal);
}

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

  // Send EC assignment email — Email #10 with full project summaries
  if (member.user?.email && member.token) {
    const [capexCtx, bpmRecord] = await Promise.all([
      db.capexRequest.findUnique({
        where: { id: capexId },
        include: {
          project: { select: { name: true, prjNumber: true, region: true, country: true, location: true } },
          projectManager: { select: { name: true } },
          sectionDetails: {
            select: {
              infrastructureCostTotal: true, eusCostTotal: true, capitalLaborCostTotal: true,
              construction: true, electricalCabling: true, furnitureFixture: true,
              others: true, tenantImprovementAllowance: true, securityTotal: true,
              leaseRegion: true, leaseLocation: true, leaseDetails: true,
            },
          },
          relatedCapex: { select: { capExNo: true } },
        },
      }),
      db.capexRequestBusinessPm.findUnique({
        where: { capExRequestId: capexId },
        select: { itPmId: true },
      }),
    ]);

    const sd = capexCtx?.sectionDetails;
    const n = (v: unknown) => Number(v) || 0;
    const itTotal = n(sd?.infrastructureCostTotal) + n(sd?.eusCostTotal) + n(sd?.capitalLaborCostTotal);
    const facTotal = n(sd?.construction) + n(sd?.electricalCabling) + n(sd?.furnitureFixture) + n(sd?.others) + n(sd?.tenantImprovementAllowance);
    const secTotal = n(sd?.securityTotal);
    const grandTotal = itTotal + facTotal + secTotal;

    const financeTeamEmail = process.env.FINANCE_TEAM_EMAIL;
    const bpmUser = bpmRecord?.itPmId
      ? await db.user.findUnique({ where: { id: bpmRecord.itPmId }, select: { email: true } })
      : null;
    const bpmEmail = bpmUser?.email;
    const ccList = [bpmEmail, financeTeamEmail].filter(Boolean) as string[];

    sendEmail(
      ecAssignedEmail({
        to: member.user.email,
        cc: ccList.length ? ccList : undefined,
        memberName: member.user.name,
        projectName: capexCtx?.project?.name ?? "",
        projectNumber: capexCtx?.project?.prjNumber ?? "",
        projectManager: capexCtx?.projectManager?.name ?? "",
        region: capexCtx?.project?.region ?? undefined,
        country: capexCtx?.project?.country ?? undefined,
        location: capexCtx?.project?.location ?? undefined,
        grandTotal,
        token: member.token,
        itSummary: itTotal > 0 ? { total: itTotal, breakdown: [
          { label: "Infrastructure Cost", amount: n(sd?.infrastructureCostTotal) },
          { label: "EUS Cost",            amount: n(sd?.eusCostTotal) },
          { label: "Capital Labor Cost",  amount: n(sd?.capitalLaborCostTotal) },
        ].filter((i) => i.amount > 0) } : null,
        facilitiesSummary: facTotal > 0 ? { total: facTotal, breakdown: [
          { label: "Construction",               amount: n(sd?.construction) },
          { label: "Electrical/Cabling",          amount: n(sd?.electricalCabling) },
          { label: "Furniture & Fixture",         amount: n(sd?.furnitureFixture) },
          { label: "Others",                      amount: n(sd?.others) },
          { label: "Tenant Improvement Allowance", amount: n(sd?.tenantImprovementAllowance) },
        ].filter((i) => i.amount !== 0) } : null,
        securitySummary: secTotal > 0 ? { total: secTotal } : null,
        leaseInfo: sd?.leaseRegion || sd?.leaseLocation ? {
          region: sd.leaseRegion ?? undefined,
          location: sd.leaseLocation ?? undefined,
          details: sd.leaseDetails ?? undefined,
        } : null,
        relatedCapexIds: capexCtx?.relatedCapex?.map((r) => r.capExNo).filter((id): id is string => id !== null) ?? [],
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
  const { id, sendEmail: doSendEmail, ...data } = body;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  // Resend EC email without updating any fields
  if (doSendEmail) {
    const member = await db.executiveCommitteeMember.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        capexRequest: {
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
        },
      },
    });
    if (member?.user?.email && member.token) {
      const sd = member.capexRequest?.sectionDetails;
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
          projectName: member.capexRequest?.project?.name ?? "",
          projectNumber: member.capexRequest?.project?.prjNumber ?? "",
          projectManager: member.capexRequest?.projectManager?.name ?? "",
          grandTotal,
          token: member.token,
        })
      ).catch(() => {});
    }
    return Response.json({ ok: true });
  }

  const member = await db.executiveCommitteeMember.update({
    where: { id },
    data: { ...data, lastModifyDate: new Date() },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Auto-complete EC Committee Approval + auto-generate CapEx ID when all members approved
  if (data.status === "Approved") {
    const allMembers = await db.executiveCommitteeMember.findMany({
      where: { capExRequestId: member.capExRequestId },
      select: { status: true },
    });
    const allApproved = allMembers.length > 0 && allMembers.every((m) => m.status === "Approved");
    if (allApproved) {
      const capexReq = await db.capexRequest.findUnique({
        where: { id: member.capExRequestId },
        include: {
          project: { select: { id: true, name: true, prjNumber: true } },
          projectManager: { select: { email: true } },
          businessRequester: { select: { email: true } },
          businessPm: { select: { itPmId: true, facilitiesPmId: true } },
          relatedCapex: { select: { capExNo: true } },
          financeApproval: { select: { projectCapex: true } },
        },
      });

      if (capexReq?.project?.id) {
        await autoCompleteMilestone(
          member.capExRequestId,
          capexReq.project.id,
          "EC Committee Approval",
          undefined
        );

        // Only auto-generate CapEx ID when amount > $25K (EC path) and not already generated
        const grandTotal = await getGrandTotalForCapex(member.capExRequestId);
        if (grandTotal > EC_THRESHOLD && !capexReq.financeApproval?.projectCapex) {
          const generatedId = generateCapExId(capexReq.project.prjNumber);

          await db.capexFinanceApproval.upsert({
            where: { capExRequestId: member.capExRequestId },
            create: { capExRequestId: member.capExRequestId, projectCapex: generatedId },
            update: { projectCapex: generatedId },
          });

          await autoCompleteMilestone(
            member.capExRequestId,
            capexReq.project.id,
            "CAPEX ID Generated",
            undefined
          );

          // Notify recipients
          const functionalLeaders = await db.user.findMany({
            where: {
              isActive: true,
              userRoles: { some: { role: { name: { in: ["IT Manager", "Facilities Manager", "Security Manager"] } } } },
            },
            select: { email: true },
          });
          const pmIds = [capexReq.businessPm?.itPmId, capexReq.businessPm?.facilitiesPmId].filter(Boolean) as string[];
          const pmUsers = pmIds.length
            ? await db.user.findMany({ where: { id: { in: pmIds }, isActive: true }, select: { email: true } })
            : [];

          const toSet = new Set<string>();
          if (capexReq.businessRequester?.email) toSet.add(capexReq.businessRequester.email);
          if (capexReq.projectManager?.email) toSet.add(capexReq.projectManager.email);
          pmUsers.forEach((u) => toSet.add(u.email));
          functionalLeaders.forEach((u) => u.email && toSet.add(u.email));

          if (toSet.size > 0) {
            sendEmail(
              capexIdGeneratedEmail({
                to: Array.from(toSet),
                capexId: generatedId,
                projectName: capexReq.project.name,
                projectNumber: capexReq.project.prjNumber,
                prjId: capexReq.project.id,
                generatedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                relatedCapexIds: capexReq.relatedCapex?.map((r) => r.capExNo).filter((id): id is string => id !== null) ?? [],
              })
            ).catch(() => {});
          }
        }
      }
    }
  }

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
