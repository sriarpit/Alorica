import { notFound } from "next/navigation";
import { getMilestonePageData } from "@/lib/milestones";
import { MilestonesPhaseClient } from "@/components/milestones/MilestonesPhaseClient";

export default async function Phase2Page({ params }: { params: { prjId: string } }) {
  const data = await getMilestonePageData(params.prjId, 2);
  if (!data) notFound();

  return (
    <MilestonesPhaseClient
      prjId={params.prjId}
      phaseNumber={2}
      phaseLabel="Planning & Approval"
      phaseColor="bg-blue-500"
      rows={data.rows}
      users={data.users}
    />
  );
}
