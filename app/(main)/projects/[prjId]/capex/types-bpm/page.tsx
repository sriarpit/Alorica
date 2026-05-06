import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TypesBpmForm } from "@/components/capex/TypesBpmForm";

export default async function TypesBpmPage({ params }: { params: { prjId: string } }) {
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
    include: { businessPm: true },
    orderBy: { createdOn: "desc" },
  });

  return (
    <TypesBpmForm
      prjId={params.prjId}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      initialData={capex?.businessPm ? {
        isIt: capex.businessPm.isIt,
        isFacilities: capex.businessPm.isFacilities,
        isPhysicalSecurity: capex.businessPm.isPhysicalSecurity,
        itPmId: capex.businessPm.itPmId ?? null,
        facilitiesPmId: capex.businessPm.facilitiesPmId ?? null,
        physicalSecurityPmId: capex.businessPm.physicalSecurityPmId ?? null,
        isRoiRequired: capex.businessPm.isRoiRequired,
        roiComment: capex.businessPm.roiComment ?? null,
        status: capex.businessPm.status,
      } : null}
      capexState={capex?.state ?? "Draft"}
      users={users}
    />
  );
}
