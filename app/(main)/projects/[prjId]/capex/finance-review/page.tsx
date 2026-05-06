import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FinanceReviewForm } from "@/components/capex/FinanceReviewForm";

export default async function FinanceReviewPage({ params }: { params: { prjId: string } }) {
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
  const itTotal = [sd?.infrastructureCostTotal, sd?.eusCostTotal, sd?.capitalLaborCostTotal]
    .reduce((s, v) => s + (Number(v) || 0), 0);
  const facGross = [sd?.construction, sd?.electricalCabling, sd?.furnitureFixture, sd?.others]
    .reduce((s, v) => s + (Number(v) || 0), 0);
  const facNet = facGross + (Number(sd?.tenantImprovementAllowance) || 0);
  const secTotal = Number(sd?.securityTotal) || 0;
  const grandTotal = itTotal + facNet + secTotal;

  const fa = capex?.financeApproval;

  return (
    <FinanceReviewForm
      prjId={params.prjId}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      grandTotal={grandTotal}
      totals={{ it: itTotal, facilities: facNet, security: secTotal }}
      capexState={capex?.state ?? "Draft"}
      financeData={fa ? {
        id: fa.capExRequestId,
        isBudget: fa.isBudget ?? null,
        explanation: fa.explanation ?? null,
        regCorpFinanceApproverId: fa.regCorpFinanceApproverId ?? null,
        regionalApprovalStatusId: fa.regionalApprovalStatusId ?? null,
        vpFinanceApproverId: fa.vpFinanceApproverId ?? null,
        vpFinanceApprovalStatusId: fa.vpFinanceApprovalStatusId ?? null,
        projectCapex: fa.projectCapex ?? null,
        statusRC: fa.statusRC ?? null,
        statusVP: fa.statusVP ?? null,
      } : null}
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
    />
  );
}
