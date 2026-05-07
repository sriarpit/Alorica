import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { RequestDetailsForm } from "@/components/capex/RequestDetailsForm";

export default async function RequestDetailsPage({ params }: { params: { prjId: string } }) {
  const session = await auth();
  const userRoles: string[] = (session?.user as any)?.roles ?? [];
  const currentUserName: string = (session?.user as any)?.name ?? "";

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

  // Fetch existing capex request (with finance approval to check RC status)
  const capex = await db.capexRequest.findFirst({
    where: { projectId: params.prjId, isActive: true },
    include: { financeApproval: { select: { regCorpApproveById: true } } },
    orderBy: { createdOn: "desc" },
  });

  const isRCApproved = !!(capex as any)?.financeApproval?.regCorpApproveById;

  // Fetch client names (mock EDL list stored in client_names table)
  let clientNames: { id: string; clientName: string }[] = [];
  try {
    clientNames = await (db as any).clientName.findMany({ orderBy: { clientName: "asc" } });
  } catch { /* table may not be seeded yet */ }

  return (
    <RequestDetailsForm
      prjId={params.prjId}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        businessOwnerName: project.businessOwner?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
        startDate: project.startDate?.toISOString() ?? null,
        endDate: project.endDate?.toISOString() ?? null,
        region: project.region ?? null,
        country: project.country ?? null,
        location: project.location ?? null,
      }}
      initialData={
        capex
          ? {
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
              clientNameFromDropdown: capex.clientNameFromDropdown ?? null,
              clientName: capex.clientName ?? null,
              isNewlogoNotListed: (capex as any).isNewlogoNotListed ?? false,
              clientMandatedComments: (capex as any).clientMandatedComments ?? null,
              isFunded: capex.isFunded,
              isClientContractualObligation: capex.isClientContractualObligation,
              capexClassificationId: capex.capexClassificationId ?? null,
              capexSubClassificationId: capex.capexSubClassificationId ?? null,
              projectTypeId: capex.projectTypeId ?? null,
              goLiveOnDate: capex.goLiveOnDate?.toISOString() ?? null,
              googlemapsLocationlink: capex.googlemapsLocationlink ?? null,
              scope: capex.scope ?? null,
              isNewlogoGrowth: capex.isNewlogoGrowth,
              newlogoGrowth: capex.newlogoGrowth ?? null,
              state: capex.state,
            }
          : null
      }
      classifications={classifications}
      subClassifications={subClassifications}
      projectTypes={projectTypes}
      users={users}
      clientNames={clientNames}
      userRoles={userRoles}
      currentUserName={currentUserName}
      isRCApproved={isRCApproved}
    />
  );
}
