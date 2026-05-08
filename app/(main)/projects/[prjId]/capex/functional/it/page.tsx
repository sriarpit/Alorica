import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ItForm } from "@/components/capex/ItForm";

export default async function ItPage({ params }: { params: { prjId: string } }) {
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

  // Fetch IT comments
  let itComments: { id: string; comments: string | null; createdByName: string; createdOn: string }[] = [];
  if (capex?.id) {
    const rawComments = await db.comment.findMany({
      where: { capExRequestId: capex.id, categoryType: "ITPMSection" },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdOn: "desc" },
    });
    itComments = rawComments.map((c) => ({
      id: c.id,
      comments: c.comments,
      createdByName: c.createdBy?.name ?? "Unknown",
      createdOn: c.createdOn.toISOString(),
    }));
  }

  // Fetch IT attachments
  let initialAttachments: { id: string; fileName: string; fileContent: string }[] = [];
  if (capex?.id) {
    initialAttachments = await db.capexAttachment.findMany({
      where: { capExRequestId: capex.id, sectionId: "AttachFilesIT" },
      select: { id: true, fileName: true, fileContent: true },
      orderBy: { id: "desc" },
    });
  }

  return (
    <ItForm
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
              infrastructureCostTotal: sd.infrastructureCostTotal
                ? Number(sd.infrastructureCostTotal)
                : null,
              infrastructureCostSeats: sd.infrastructureCostSeats ?? null,
              eusCostTotal: sd.eusCostTotal ? Number(sd.eusCostTotal) : null,
              eusCostSeats: sd.eusCostSeats ?? null,
              capitalLaborCostTotal: sd.capitalLaborCostTotal
                ? Number(sd.capitalLaborCostTotal)
                : null,
              capitalLaborCostSeats: sd.capitalLaborCostSeats ?? null,
              isExistingInventoryEvaluatedIT: sd.isExistingInventoryEvaluatedIT ?? null,
              isCompetitiveBidIT: sd.isCompetitiveBidIT ?? null,
              infrastructureLeadApproverId: sd.infrastructureLeadApproverId ?? null,
              infrastructureLeadStatus: sd.infrastructureLeadStatus ?? null,
              infrastructureLeadApprovedById: sd.infrastructureLeadApprovedById ?? null,
              infrastructureLeadApprovedDate: sd.infrastructureLeadApprovedDate?.toISOString() ?? null,
              eusLeadApproverId: sd.eusLeadApproverId ?? null,
              eusStatus: sd.eusStatus ?? null,
              eusApprovedById: sd.eusApprovedById ?? null,
              eusApprovedDate: sd.eusApprovedDate?.toISOString() ?? null,
              capitalLaborLeadApproverId: sd.capitalLaborLeadApproverId ?? null,
              capitalLaborLeadStatus: sd.capitalLaborLeadStatus ?? null,
              capitalLaborApprovedById: sd.capitalLaborApprovedById ?? null,
              capitalLaborApprovedDate: sd.capitalLaborApprovedDate?.toISOString() ?? null,
              documentSummary: sd.itComments ?? null,
              itSessionStatus: sd.itSessionStatus ?? null,
            }
          : null
      }
      capexState={capex?.state ?? "Draft"}
      isRCApproved={isRCApproved}
      userRoles={userRoles}
      currentUserName={currentUserName}
      currentUserId={currentUserId}
      users={users}
      initialComments={itComments}
      initialAttachments={initialAttachments}
    />
  );
}
