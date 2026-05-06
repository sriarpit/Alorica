import { redirect } from "next/navigation";

export default function MilestonesRootPage({ params }: { params: { prjId: string } }) {
  redirect(`/projects/${params.prjId}/milestones/phase-2`);
}
