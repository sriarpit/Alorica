import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { SecurityForm } from "@/components/capex/SecurityForm";

export default async function SecurityPage({ params }: { params: { prjId: string } }) {
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
      financeApproval: { select: { regCorpApproveById: true } },
    },
    orderBy: { createdOn: "desc" },
  });

  const isRCApproved = !!(capex as any)?.financeApproval?.regCorpApproveById;
  // Show Security section only if Physical Security was selected in BPM
  const isPhysicalSecuritySelected = capex?.businessPm?.isPhysicalSecurity ?? false;
  const sd = capex?.sectionDetails;

  // Fetch Security comments
  let securityComments: { id: string; comments: string | null; createdByName: string; createdOn: string }[] = [];
  if (capex?.id) {
    const rawComments = await db.comment.findMany({
      where: { capExRequestId: capex.id, categoryType: "SecurityPMSection" },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdOn: "desc" },
    });
    securityComments = rawComments.map((c) => ({
      id: c.id,
      comments: c.comments,
      createdByName: c.createdBy?.name ?? "Unknown",
      createdOn: c.createdOn.toISOString(),
    }));
  }

  // Fetch Security attachments
  let initialAttachments: { id: string; fileName: string; fileContent: string }[] = [];
  if (capex?.id) {
    initialAttachments = await db.capexAttachment.findMany({
      where: { capExRequestId: capex.id, sectionId: "AttachFilesSecurity" },
      select: { id: true, fileName: true, fileContent: true },
      orderBy: { id: "desc" },
    });
  }

  return (
    <SecurityForm
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
              securityTotal: sd.securityTotal ? Number(sd.securityTotal) : null,
              securitySeats: sd.securitySeats ?? null,
              isExistingInventoryEvaluatedSec: sd.isExistingInventoryEvaluatedSec ?? null,
              isCompetitiveBidSec: sd.isCompetitiveBidSec ?? null,
              securityLeadApproverId: sd.securityLeadApproverId ?? null,
              securityLeadApprovedById: sd.securityLeadApprovedById ?? null,
              securityLeadApproveStatus: sd.securityLeadApproveStatus ?? null,
              securityApprovedDate: sd.securityApprovedDate?.toISOString() ?? null,
              securitySessionStatus: sd.securitySessionStatus ?? null,
            }
          : null
      }
      capexState={capex?.state ?? "Draft"}
      isRCApproved={isRCApproved}
      isPhysicalSecuritySelected={isPhysicalSecuritySelected}
      userRoles={userRoles}
      currentUserName={currentUserName}
      currentUserId={currentUserId}
      users={users}
      initialComments={securityComments}
      initialAttachments={initialAttachments}
    />
  );
}
