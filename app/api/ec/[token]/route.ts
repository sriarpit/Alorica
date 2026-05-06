import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import { ecAllApprovedEmail } from "@/lib/email/templates";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const formData = await req.formData();
  const decision = formData.get("decision") as string | null;
  const comments = formData.get("comments") as string | null;

  if (!decision || !["Approved", "Rejected"].includes(decision)) {
    return new Response("Invalid decision", { status: 400 });
  }

  const member = await db.executiveCommitteeMember.findUnique({
    where: { token: params.token },
  });

  if (!member) {
    return new Response("Invalid or expired link", { status: 404 });
  }

  if (member.status !== "Pending") {
    return Response.redirect(new URL(`/ec/${params.token}`, req.url));
  }

  await db.executiveCommitteeMember.update({
    where: { token: params.token },
    data: {
      status: decision as "Approved" | "Rejected",
      comments: comments || null,
      lastModifyDate: new Date(),
    },
  });

  // Check if ALL EC members for this capex request are now Approved
  if (decision === "Approved") {
    const allMembers = await db.executiveCommitteeMember.findMany({
      where: { capExRequestId: member.capExRequestId },
      select: { status: true },
    });
    const allApproved = allMembers.every((m) => m.status === "Approved");

    if (allApproved) {
      // Notify Project Manager
      const capex = await db.capexRequest.findUnique({
        where: { id: member.capExRequestId },
        include: {
          projectManager: { select: { name: true, email: true } },
          project: { select: { name: true, prjNumber: true, id: true } },
        },
      });
      const pm = capex?.projectManager;
      if (pm?.email && capex?.project) {
        sendEmail(
          ecAllApprovedEmail({
            to: pm.email,
            pmName: pm.name,
            projectName: capex.project.name,
            projectNumber: capex.project.prjNumber,
            prjId: capex.project.id,
          })
        ).catch(() => {});
      }
    }
  }

  return Response.redirect(new URL(`/ec/${params.token}`, req.url));
}
