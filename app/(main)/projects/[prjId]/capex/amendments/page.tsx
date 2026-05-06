import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AmendmentsForm } from "@/components/capex/AmendmentsForm";

export default async function AmendmentsPage({ params }: { params: { prjId: string } }) {
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
      amendments: {
        include: { leadApprover: { select: { id: true, name: true } } },
        orderBy: { createdOn: "desc" },
      },
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

  return (
    <AmendmentsForm
      prjId={params.prjId}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      grandTotal={grandTotal}
      capexState={capex?.state ?? "Draft"}
      initialAmendments={(capex?.amendments ?? []).map((a) => ({
        id: a.id,
        amendment: a.amendment ?? null,
        amendmentAmount: a.amendmentAmount ? Number(a.amendmentAmount) : null,
        note: a.note ?? null,
        leadApproverId: a.leadApproverId ?? null,
        leadApproverName: a.leadApprover?.name ?? null,
        approvalStatusId: a.approvalStatusId ?? null,
        status: a.status,
        createdOn: a.createdOn.toISOString(),
      }))}
      users={users}
    />
  );
}
