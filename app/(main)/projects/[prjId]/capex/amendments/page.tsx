import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AmendmentsForm } from "@/components/capex/AmendmentsForm";

export default async function AmendmentsPage({ params }: { params: { prjId: string } }) {
  const session = await auth();
  const userRoles: string[] = (session?.user as any)?.roles ?? [];
  const currentUserName: string = (session?.user as any)?.name ?? "";
  const currentUserId: string = (session?.user as any)?.id ?? "";

  const [project, itLeaders, facLeaders, secLeaders] = await Promise.all([
    db.project.findUnique({
      where: { id: params.prjId },
      include: { projectManager: { select: { id: true, name: true } } },
    }),
    db.user.findMany({
      where: { isActive: true, userRoles: { some: { role: { name: "IT Leadership" } } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true, userRoles: { some: { role: { name: "Facilities Leadership" } } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true, userRoles: { some: { role: { name: "Security Leadership" } } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  const capex = await db.capexRequest.findFirst({
    where: { projectId: params.prjId, isActive: true },
    include: {
      sectionDetails: true,
      businessPm: { select: { isIt: true, isFacilities: true, isPhysicalSecurity: true } },
      financeApproval: { select: { projectCapex: true } },
      amendments: {
        include: {
          leadApprover: { select: { id: true, name: true } },
          leadApprovedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdOn: "asc" },
      },
    },
    orderBy: { createdOn: "desc" },
  });

  const sd = capex?.sectionDetails;

  // Base section totals
  const infraTotal = Number(sd?.infrastructureCostTotal) || 0;
  const eusTotal = Number(sd?.eusCostTotal) || 0;
  const capLaborTotal = Number(sd?.capitalLaborCostTotal) || 0;
  const baseIT = infraTotal + eusTotal + capLaborTotal;

  const constrTotal = Number(sd?.construction) || 0;
  const elecTotal = Number(sd?.electricalCabling) || 0;
  const furnTotal = Number(sd?.furnitureFixture) || 0;
  const othersTotal = Number(sd?.others) || 0;
  const facGross = constrTotal + elecTotal + furnTotal + othersTotal;
  const facTIA = Number(sd?.tenantImprovementAllowance) || 0;
  const baseFac = facGross + facTIA;

  const baseSec = Number(sd?.securityTotal) || 0;

  // Avg seats per section
  const infraSeats = Number(sd?.infrastructureCostSeats) || 0;
  const eusSeats = Number(sd?.eusCostSeats) || 0;
  const capLaborSeats = Number(sd?.capitalLaborCostSeats) || 0;
  const itAvgSeats = (infraSeats + eusSeats + capLaborSeats) / 3;

  const constrSeats = Number(sd?.constructionSeats) || 0;
  const elecSeats = Number(sd?.electricalCablingSeats) || 0;
  const furnSeats = Number(sd?.furnitureFixtureSeats) || 0;
  const othersSeats = Number(sd?.othersSeats) || 0;
  const facAvgSeats = (constrSeats + elecSeats + furnSeats + othersSeats) / 4;

  const secSeats = Number(sd?.securitySeats) || 0;

  const capexIdGenerated = !!capex?.financeApproval?.projectCapex;
  const bpm = capex?.businessPm;

  return (
    <AmendmentsForm
      prjId={params.prjId}
      capexId={capex?.id ?? null}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      baseTotals={{
        it: baseIT,
        facilities: baseFac,
        security: baseSec,
        itSeats: itAvgSeats,
        facSeats: facAvgSeats,
        secSeats: secSeats,
      }}
      bpm={bpm ?? null}
      capexState={capex?.state ?? "Draft"}
      capexIdGenerated={capexIdGenerated}
      initialAmendments={(capex?.amendments ?? []).map((a, idx) => ({
        id: a.id,
        index: idx + 1,
        amendment: a.amendment ?? null,
        amendmentAmount: a.amendmentAmount ? Number(a.amendmentAmount) : null,
        amendmentDate: a.amendmentDate?.toISOString() ?? null,
        note: a.note ?? null,
        leadApproverId: a.leadApproverId ?? null,
        leadApproverName: a.leadApprover?.name ?? null,
        leadApproveById: a.leadApproveById ?? null,
        leadApprovedByName: a.leadApprovedBy?.name ?? null,
        leadApproveDate: a.leadApproveDate?.toISOString() ?? null,
        approvalStatusId: a.approvalStatusId ?? null,
        status: a.status,
        createdOn: a.createdOn.toISOString(),
        updatedOn: a.updatedOn.toISOString(),
      }))}
      approversBySection={{
        IT: itLeaders,
        Facilities: facLeaders,
        "Physical Security": secLeaders,
      }}
      userRoles={userRoles}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
    />
  );
}
