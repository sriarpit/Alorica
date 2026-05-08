import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { FinanceReviewForm } from "@/components/capex/FinanceReviewForm";

export default async function FinanceReviewPage({ params }: { params: { prjId: string } }) {
  const session = await auth();
  const userRoles: string[] = (session?.user as any)?.roles ?? [];
  const currentUserName: string = (session?.user as any)?.name ?? "";
  const currentUserId: string = (session?.user as any)?.id ?? "";

  const [project, users] = await Promise.all([
    db.project.findUnique({
      where: { id: params.prjId },
      include: { projectManager: { select: { id: true, name: true } } },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  const capex = await db.capexRequest.findFirst({
    where: { projectId: params.prjId, isActive: true },
    include: {
      sectionDetails: true,
      businessPm: { select: { isIt: true, isFacilities: true, isPhysicalSecurity: true } },
      businessSponsor: { select: { name: true } },
      businessRequester: { select: { name: true } },
      financeApproval: {
        include: {
          rcFinanceApprover: { select: { id: true, name: true } },
          rcFinanceApprovedBy: { select: { id: true, name: true } },
          vpFinanceApprover: { select: { id: true, name: true } },
          vpFinanceApprovedBy: { select: { id: true, name: true } },
        },
      },
      ecMembers: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { lastModifyDate: "desc" },
      },
      relatedCapex: { orderBy: { createdDate: "desc" } },
    },
    orderBy: { createdOn: "desc" },
  });

  const sd = capex?.sectionDetails;

  // IT totals
  const infraTotal = Number(sd?.infrastructureCostTotal) || 0;
  const eusTotal = Number(sd?.eusCostTotal) || 0;
  const capLaborTotal = Number(sd?.capitalLaborCostTotal) || 0;
  const itTotal = infraTotal + eusTotal + capLaborTotal;
  const infraSeats = Number(sd?.infrastructureCostSeats) || 0;
  const eusSeats = Number(sd?.eusCostSeats) || 0;
  const capLaborSeats = Number(sd?.capitalLaborCostSeats) || 0;
  const itAvgSeats = (infraSeats + eusSeats + capLaborSeats) / 3;

  // Facilities totals
  const constrTotal = Number(sd?.construction) || 0;
  const elecTotal = Number(sd?.electricalCabling) || 0;
  const furnTotal = Number(sd?.furnitureFixture) || 0;
  const othersTotal = Number(sd?.others) || 0;
  const facGross = constrTotal + elecTotal + furnTotal + othersTotal;
  const facTIA = Number(sd?.tenantImprovementAllowance) || 0;
  const facNet = facGross + facTIA;
  const constrSeats = Number(sd?.constructionSeats) || 0;
  const elecSeats = Number(sd?.electricalCablingSeats) || 0;
  const furnSeats = Number(sd?.furnitureFixtureSeats) || 0;
  const othersSeats = Number(sd?.othersSeats) || 0;
  const facAvgSeats = (constrSeats + elecSeats + furnSeats + othersSeats) / 4;

  // Security totals
  const secTotal = Number(sd?.securityTotal) || 0;
  const secSeats = Number(sd?.securitySeats) || 0;

  const grandTotal = itTotal + facNet + secTotal;

  // RC / VP comments
  let rcComments: { id: string; comments: string | null; createdByName: string; createdOn: string }[] = [];
  let vpComments: { id: string; comments: string | null; createdByName: string; createdOn: string }[] = [];
  if (capex?.id) {
    const [rawRc, rawVp] = await Promise.all([
      db.comment.findMany({
        where: { capExRequestId: capex.id, commentsType: "Regional_CorporateFinanceComments" },
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdOn: "desc" },
      }),
      db.comment.findMany({
        where: { capExRequestId: capex.id, commentsType: "VPFinanceComments" },
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdOn: "desc" },
      }),
    ]);
    rcComments = rawRc.map((c) => ({
      id: c.id,
      comments: c.comments,
      createdByName: c.createdBy?.name ?? "Unknown",
      createdOn: c.createdOn.toISOString(),
    }));
    vpComments = rawVp.map((c) => ({
      id: c.id,
      comments: c.comments,
      createdByName: c.createdBy?.name ?? "Unknown",
      createdOn: c.createdOn.toISOString(),
    }));
  }

  // Finance attachments
  let initialAttachments: { id: string; fileName: string; fileContent: string }[] = [];
  if (capex?.id) {
    initialAttachments = await db.capexAttachment.findMany({
      where: { capExRequestId: capex.id, sectionId: "FinanceReviewFileUpload" },
      select: { id: true, fileName: true, fileContent: true },
      orderBy: { id: "desc" },
    });
  }

  const fa = capex?.financeApproval;
  const bpm = capex?.businessPm;

  const sectionSummary = sd
    ? {
        it: {
          infrastructureCostTotal: infraTotal,
          eusCostTotal: eusTotal,
          capitalLaborCostTotal: capLaborTotal,
          infrastructureCostSeats: infraSeats,
          eusCostSeats: eusSeats,
          capitalLaborCostSeats: capLaborSeats,
          itComments: sd.itComments ?? null,
        },
        facilities: {
          construction: constrTotal,
          electricalCabling: elecTotal,
          furnitureFixture: furnTotal,
          others: othersTotal,
          constructionSeats: constrSeats,
          electricalCablingSeats: elecSeats,
          furnitureFixtureSeats: furnSeats,
          othersSeats: othersSeats,
          tenantImprovementAllowance: facTIA,
          grossTotal: facGross,
          netTotal: facNet,
        },
        security: {
          securityTotal: secTotal,
          securitySeats: secSeats,
        },
        lease: {
          leaseRegion: sd.leaseRegion ?? null,
          leaseLocation: sd.leaseLocation ?? null,
          leaseDetails: sd.leaseDetails ?? null,
          leaseTerms: sd.leaseTerms ?? null,
          leaseTermsConditions: sd.leaseTermsConditions ?? null,
          totalLeaseValue: Number(sd.totalLeaseValue) || 0,
          currentYearOpexImpact: Number(sd.currentYearOpexImpact) || 0,
        },
      }
    : null;

  const clientInfo = capex
    ? {
        businessSponsorName:
          capex.businessSponsor?.name ?? capex.tempBusinessSponsorEmail ?? null,
        businessRequesterName:
          capex.businessRequester?.name ?? capex.tempBusinessRequesterEmail ?? null,
        projectDescription: capex.projectDescription ?? null,
        businessJustification: capex.businessJustification ?? null,
        isClientMandated: capex.isClientMandated ?? null,
        isFunded: capex.isFunded ?? null,
        requestStatus: capex.requestStatus ?? null,
      }
    : null;

  return (
    <FinanceReviewForm
      prjId={params.prjId}
      capexId={capex?.id ?? null}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      grandTotal={grandTotal}
      totals={{
        it: itTotal,
        itSeats: itAvgSeats,
        facilities: facNet,
        facSeats: facAvgSeats,
        security: secTotal,
        secSeats: secSeats,
      }}
      sectionSummary={sectionSummary}
      clientInfo={clientInfo}
      bpm={bpm ?? null}
      capexState={capex?.state ?? "Draft"}
      financeData={
        fa
          ? {
              id: fa.capExRequestId,
              isBudget: fa.isBudget ?? null,
              explanation: fa.explanation ?? null,
              regCorpFinanceApproverId: fa.regCorpFinanceApproverId ?? null,
              regionalApprovalStatusId: fa.regionalApprovalStatusId ?? null,
              regCorpApproveById: fa.regCorpApproveById ?? null,
              regCorpApprovedByName: fa.rcFinanceApprovedBy?.name ?? null,
              regCorpApproverDate: fa.regCorpApproverDate?.toISOString() ?? null,
              vpFinanceApproverId: fa.vpFinanceApproverId ?? null,
              vpFinanceApprovalStatusId: fa.vpFinanceApprovalStatusId ?? null,
              vpApprovedDate: fa.vpApprovedDate?.toISOString() ?? null,
              vpApprovedById: fa.vpApprovedById ?? null,
              vpApprovedByName: fa.vpFinanceApprovedBy?.name ?? null,
              projectCapex: fa.projectCapex ?? null,
              statusRC: fa.statusRC ?? null,
              statusVP: fa.statusVP ?? null,
            }
          : null
      }
      ecMembers={(capex?.ecMembers ?? []).map((m) => ({
        id: m.id,
        userId: m.userId ?? null,
        userName: m.user?.name ?? null,
        userEmail: m.user?.email ?? null,
        status: m.status,
        comments: m.comments ?? null,
        lastModifyDate: m.lastModifyDate?.toISOString() ?? null,
      }))}
      relatedCapex={(capex?.relatedCapex ?? []).map((r) => ({
        id: r.id,
        capExNo: r.capExNo ?? null,
        description: r.description ?? null,
        createdDate: r.createdDate.toISOString(),
      }))}
      users={users}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      userRoles={userRoles}
      rcComments={rcComments}
      vpComments={vpComments}
      initialAttachments={initialAttachments}
    />
  );
}
