import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { TypesBpmForm } from "@/components/capex/TypesBpmForm";

export default async function TypesBpmPage({ params }: { params: { prjId: string } }) {
  const session = await auth();
  const userRoles: string[] = (session?.user as any)?.roles ?? [];

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
      businessPm: true,
      financeApproval: { select: { regCorpApproveById: true } },
    },
    orderBy: { createdOn: "desc" },
  });

  const isRCApproved = !!(capex as any)?.financeApproval?.regCorpApproveById;

  // Fetch existing BusinessPM attachments
  let initialAttachments: { id: string; fileName: string; fileContent: string }[] = [];
  if (capex?.id) {
    initialAttachments = await db.capexAttachment.findMany({
      where: { capExRequestId: capex.id, sectionId: "BusinessPMFileUpload" },
      select: { id: true, fileName: true, fileContent: true },
      orderBy: { id: "desc" },
    });
  }

  const bpm = capex?.businessPm;

  return (
    <TypesBpmForm
      prjId={params.prjId}
      capexId={capex?.id ?? null}
      project={{
        prjNumber: project.prjNumber,
        name: project.name,
        managerName: project.projectManager?.name ?? null,
        goLiveDate: project.goLiveDate?.toISOString() ?? null,
      }}
      initialData={
        bpm
          ? {
              isIt: bpm.isIt,
              isFacilities: bpm.isFacilities,
              isPhysicalSecurity: bpm.isPhysicalSecurity,
              itPmId: bpm.itPmId ?? null,
              itPmCreateDate: bpm.itPmCreateDate?.toISOString() ?? null,
              facilitiesPmId: bpm.facilitiesPmId ?? null,
              facilitiesPmCreateDate: bpm.facilitiesPmCreateDate?.toISOString() ?? null,
              physicalSecurityPmId: bpm.physicalSecurityPmId ?? null,
              physicalSecurityPmCreateDate: bpm.physicalSecurityPmCreateDate?.toISOString() ?? null,
              isPnL: bpm.isRoiRequired,
              pnlComment: bpm.roiComment ?? null,
              status: bpm.status,
            }
          : null
      }
      capexState={capex?.state ?? "Draft"}
      isRCApproved={isRCApproved}
      userRoles={userRoles}
      users={users}
      initialAttachments={initialAttachments}
    />
  );
}
