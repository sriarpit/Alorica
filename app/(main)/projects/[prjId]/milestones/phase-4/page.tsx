import { notFound } from "next/navigation";
import { getMilestonePageData } from "@/lib/milestones";
import { MilestonesPhaseClient } from "@/components/milestones/MilestonesPhaseClient";

export default async function Phase4Page({ params }: { params: { prjId: string } }) {
  const data = await getMilestonePageData(params.prjId, 4);
  if (!data) notFound();

  return (
    <MilestonesPhaseClient
      prjId={params.prjId}
      phaseNumber={4}
      phaseLabel="Implementation / Build-Out"
      phaseColor="bg-orange-500"
      rows={data.rows}
      users={data.users}
    />
  );
}
