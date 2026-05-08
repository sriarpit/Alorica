import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMilestonePageData } from "@/lib/milestones";
import { MilestonesPhaseClient } from "@/components/milestones/MilestonesPhaseClient";

export default async function Phase3Page({ params }: { params: { prjId: string } }) {
  const [session, data] = await Promise.all([
    auth(),
    getMilestonePageData(params.prjId, 3),
  ]);
  if (!data) notFound();

  const userRoles: string[] = (session?.user as any)?.roles ?? [];
  const currentUserId: string = (session?.user as any)?.id ?? "";

  return (
    <MilestonesPhaseClient
      prjId={params.prjId}
      phaseNumber={3}
      phaseLabel="Design & Order"
      phaseColor="bg-violet-500"
      rows={data.rows}
      users={data.users}
      capexId={data.capexId}
      userRoles={userRoles}
      currentUserId={currentUserId}
    />
  );
}
