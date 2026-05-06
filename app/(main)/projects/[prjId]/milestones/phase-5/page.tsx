import { notFound } from "next/navigation";
import { getMilestonePageData } from "@/lib/milestones";
import { MilestonesPhaseClient } from "@/components/milestones/MilestonesPhaseClient";

export default async function Phase5Page({ params }: { params: { prjId: string } }) {
  const data = await getMilestonePageData(params.prjId, 5);
  if (!data) notFound();

  return (
    <MilestonesPhaseClient
      prjId={params.prjId}
      phaseNumber={5}
      phaseLabel="Site Ready"
      phaseColor="bg-green-500"
      rows={data.rows}
      users={data.users}
    />
  );
}
