import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FacilitiesForm } from "@/components/capex/FacilitiesForm";

export default async function FacilitiesPage({ params }: { params: { prjId: string } }) {
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
    <FacilitiesForm
      prjId={params.prjId}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      initialData={sd ? {
        construction: sd.construction ? Number(sd.construction) : null,
        constructionSeats: sd.constructionSeats ?? null,
        electricalCabling: sd.electricalCabling ? Number(sd.electricalCabling) : null,
        electricalCablingSeats: sd.electricalCablingSeats ?? null,
        furnitureFixture: sd.furnitureFixture ? Number(sd.furnitureFixture) : null,
        furnitureFixtureSeats: sd.furnitureFixtureSeats ?? null,
        others: sd.others ? Number(sd.others) : null,
        othersSeats: sd.othersSeats ?? null,
        tenantImprovementAllowance: sd.tenantImprovementAllowance ? Number(sd.tenantImprovementAllowance) : null,
        isExistingInventoryEvaluatedFac: sd.isExistingInventoryEvaluatedFac ?? null,
        isCompetitiveBidFac: sd.isCompetitiveBidFac ?? null,
        facilitiesLeadApproverId: sd.facilitiesLeadApproverId ?? null,
        facilitiesStatus: sd.facilitiesStatus ?? null,
        leaseRegion: sd.leaseRegion ?? null,
        leaseLocation: sd.leaseLocation ?? null,
        leaseDetails: sd.leaseDetails ?? null,
        leaseTerms: sd.leaseTerms ?? null,
        totalLeaseValue: sd.totalLeaseValue ? Number(sd.totalLeaseValue) : null,
        currentYearOpexImpact: sd.currentYearOpexImpact ? Number(sd.currentYearOpexImpact) : null,
        facilitiesSessionStatus: sd.facilitiesSessionStatus ?? null,
      } : null}
      capexState={capex?.state ?? "Draft"}
      users={users}
    />
  );
}
