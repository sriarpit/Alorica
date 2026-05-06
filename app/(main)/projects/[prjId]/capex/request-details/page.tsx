import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { RequestDetailsForm } from "@/components/capex/RequestDetailsForm";

export default async function RequestDetailsPage({ params }: { params: { prjId: string } }) {
  const [project, classifications, subClassifications, projectTypes, users] = await Promise.all([
    db.project.findUnique({
      where: { id: params.prjId },
      include: {
        projectManager: { select: { id: true, name: true } },
        businessOwner: { select: { id: true, name: true } },
      },
    }),
    db.capexClassification.findMany({ orderBy: { name: "asc" } }),
    db.capexSubClassification.findMany({ orderBy: { name: "asc" } }),
    db.projectType.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  const capex = await db.capexRequest.findFirst({
    where: { projectId: params.prjId, isActive: true },
    orderBy: { createdOn: "desc" },
  });

  return (
    <RequestDetailsForm
      prjId={params.prjId}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      initialData={capex ? {
        id: capex.id,
        requestDate: capex.requestDate?.toISOString() ?? null,
        businessRequesterId: capex.businessRequesterId ?? null,
        businessSponsorId: capex.businessSponsorId ?? null,
        serviceNowProjectNo: capex.serviceNowProjectNo ?? null,
        region: capex.region ?? null,
        country: capex.country ?? null,
        specification: capex.specification ?? null,
        projectDescription: capex.projectDescription ?? null,
        businessJustification: capex.businessJustification ?? null,
        isClientMandated: capex.isClientMandated,
        clientName: capex.clientName ?? null,
        isFunded: capex.isFunded,
        isClientContractualObligation: capex.isClientContractualObligation,
        capexClassificationId: capex.capexClassificationId ?? null,
        capexSubClassificationId: capex.capexSubClassificationId ?? null,
        projectTypeId: capex.projectTypeId ?? null,
        goLiveOnDate: capex.goLiveOnDate?.toISOString() ?? null,
        googlemapsLocationlink: capex.googlemapsLocationlink ?? null,
        scope: capex.scope ?? null,
        isNewlogoGrowth: capex.isNewlogoGrowth,
        state: capex.state,
      } : null}
      classifications={classifications}
      subClassifications={subClassifications}
      projectTypes={projectTypes}
      users={users}
    />
  );
}
