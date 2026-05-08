import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { FacilitiesForm } from "@/components/capex/FacilitiesForm";

export default async function FacilitiesPage({ params }: { params: { prjId: string } }) {
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
      financeApproval: { select: { regCorpApproveById: true } },
    },
    orderBy: { createdOn: "desc" },
  });

  const isRCApproved = !!(capex as any)?.financeApproval?.regCorpApproveById;
  const sd = capex?.sectionDetails;

  // Fetch Facilities comments
  let facilityComments: { id: string; comments: string | null; createdByName: string; createdOn: string }[] = [];
  if (capex?.id) {
    const rawComments = await db.comment.findMany({
      where: { capExRequestId: capex.id, categoryType: "FacilitiesPMSection" },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdOn: "desc" },
    });
    facilityComments = rawComments.map((c) => ({
      id: c.id,
      comments: c.comments,
      createdByName: c.createdBy?.name ?? "Unknown",
      createdOn: c.createdOn.toISOString(),
    }));
  }

  // Fetch Facilities attachments
  let initialAttachments: { id: string; fileName: string; fileContent: string }[] = [];
  if (capex?.id) {
    initialAttachments = await db.capexAttachment.findMany({
      where: { capExRequestId: capex.id, sectionId: "AttachFilesFacilities" },
      select: { id: true, fileName: true, fileContent: true },
      orderBy: { id: "desc" },
    });
  }

  return (
    <FacilitiesForm
      prjId={params.prjId}
      capexId={capex?.id ?? null}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      initialData={
        sd
          ? {
              construction: sd.construction ? Number(sd.construction) : null,
              constructionSeats: sd.constructionSeats ?? null,
              electricalCabling: sd.electricalCabling ? Number(sd.electricalCabling) : null,
              electricalCablingSeats: sd.electricalCablingSeats ?? null,
              furnitureFixture: sd.furnitureFixture ? Number(sd.furnitureFixture) : null,
              furnitureFixtureSeats: sd.furnitureFixtureSeats ?? null,
              others: sd.others ? Number(sd.others) : null,
              othersSeats: sd.othersSeats ?? null,
              tenantImprovementAllowance: sd.tenantImprovementAllowance
                ? Number(sd.tenantImprovementAllowance)
                : null,
              isExistingInventoryEvaluatedFac: sd.isExistingInventoryEvaluatedFac ?? null,
              isCompetitiveBidFac: sd.isCompetitiveBidFac ?? null,
              facilitiesLeadApproverId: sd.facilitiesLeadApproverId ?? null,
              facilitiesStatus: sd.facilitiesStatus ?? null,
              facilitiesApprovedDate: sd.facilitiesApprovedDate?.toISOString() ?? null,
              leaseRegion: sd.leaseRegion ?? null,
              leaseLocation: sd.leaseLocation ?? null,
              leaseDetails: sd.leaseDetails ?? null,
              leaseTerms: sd.leaseTerms ?? null,
              leaseTermsConditions: sd.leaseTermsConditions ?? null,
              totalLeaseValue: sd.totalLeaseValue ? Number(sd.totalLeaseValue) : null,
              currentYearOpexImpact: sd.currentYearOpexImpact
                ? Number(sd.currentYearOpexImpact)
                : null,
              facilitiesSessionStatus: sd.facilitiesSessionStatus ?? null,
            }
          : null
      }
      capexState={capex?.state ?? "Draft"}
      isRCApproved={isRCApproved}
      userRoles={userRoles}
      currentUserName={currentUserName}
      currentUserId={currentUserId}
      users={users}
      initialComments={facilityComments}
      initialAttachments={initialAttachments}
    />
  );
}
