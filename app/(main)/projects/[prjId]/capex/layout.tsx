import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
  children: React.ReactNode;
  params: { prjId: string };
}

export default async function CapexLayout({ children, params }: Props) {
  const project = await db.project.findUnique({
    where: { id: params.prjId },
    select: { id: true, prjNumber: true, name: true },
  });

  if (!project) notFound();

  return <>{children}</>;
}
