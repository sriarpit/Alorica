import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SecurityForm } from "@/components/capex/SecurityForm";

export default async function SecurityPage({ params }: { params: { prjId: string } }) {
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
    <SecurityForm
      prjId={params.prjId}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      initialData={sd ? {
        securityTotal: sd.securityTotal ? Number(sd.securityTotal) : null,
        securitySeats: sd.securitySeats ?? null,
        isExistingInventoryEvaluatedSec: sd.isExistingInventoryEvaluatedSec ?? null,
        isCompetitiveBidSec: sd.isCompetitiveBidSec ?? null,
        securityLeadApproverId: sd.securityLeadApproverId ?? null,
        securityLeadApproveStatus: sd.securityLeadApproveStatus ?? null,
        securitySessionStatus: sd.securitySessionStatus ?? null,
      } : null}
      capexState={capex?.state ?? "Draft"}
      users={users}
    />
  );
}
