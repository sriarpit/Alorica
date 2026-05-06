import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ItForm } from "@/components/capex/ItForm";

export default async function ItPage({ params }: { params: { prjId: string } }) {
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
    include: { sectionDetails: true },
    orderBy: { createdOn: "desc" },
  });

  const sd = capex?.sectionDetails;

  return (
    <ItForm
      prjId={params.prjId}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      initialData={sd ? {
        infrastructureCostTotal: sd.infrastructureCostTotal ? Number(sd.infrastructureCostTotal) : null,
        infrastructureCostSeats: sd.infrastructureCostSeats ?? null,
        eusCostTotal: sd.eusCostTotal ? Number(sd.eusCostTotal) : null,
        eusCostSeats: sd.eusCostSeats ?? null,
        capitalLaborCostTotal: sd.capitalLaborCostTotal ? Number(sd.capitalLaborCostTotal) : null,
        capitalLaborCostSeats: sd.capitalLaborCostSeats ?? null,
        isExistingInventoryEvaluatedIT: sd.isExistingInventoryEvaluatedIT ?? null,
        isCompetitiveBidIT: sd.isCompetitiveBidIT ?? null,
        infrastructureLeadApproverId: sd.infrastructureLeadApproverId ?? null,
        infrastructureLeadStatus: sd.infrastructureLeadStatus ?? null,
        eusLeadApproverId: sd.eusLeadApproverId ?? null,
        eusStatus: sd.eusStatus ?? null,
        capitalLaborLeadApproverId: sd.capitalLaborLeadApproverId ?? null,
        capitalLaborLeadStatus: sd.capitalLaborLeadStatus ?? null,
        itComments: sd.itComments ?? null,
        itSessionStatus: sd.itSessionStatus ?? null,
      } : null}
      capexState={capex?.state ?? "Draft"}
      users={users}
    />
  );
}
