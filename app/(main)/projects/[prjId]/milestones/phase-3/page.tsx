import { notFound } from "next/navigation";
import { getMilestonePageData } from "@/lib/milestones";
import { MilestonesPhaseClient } from "@/components/milestones/MilestonesPhaseClient";

export default async function Phase3Page({ params }: { params: { prjId: string } }) {
  const data = await getMilestonePageData(params.prjId, 3);
  if (!data) notFound();

  return (
    <MilestonesPhaseClient
      prjId={params.prjId}
      phaseNumber={3}
      phaseLabel="Design & Order"
      phaseColor="bg-violet-500"
      rows={data.rows}
      users={data.users}
    />
  );
}
