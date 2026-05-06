import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function EcApprovalPage({ params }: { params: { token: string } }) {
  const member = await db.executiveCommitteeMember.findUnique({
    where: { token: params.token },
    include: {
      capexRequest: {
        include: {
          sectionDetails: true,
          financeApproval: true,
        },
      },
      user: true,
    },
  });

  if (!member) notFound();

  const { capexRequest } = member;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-[#0f1e35] px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-white font-bold text-sm">A</div>
            <span className="text-white font-bold text-xl">ALORICA</span>
          </div>
          <p className="text-gray-300 text-sm">Executive Committee Approval</p>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">CapEx Approval Request</h2>
            <p className="text-sm text-gray-500 mt-1">
              You have been requested to review and approve this capital expenditure request.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            <Row label="Project Name" value={capexRequest.projectName ?? "—"} />
            <Row label="Project Number" value={capexRequest.serviceNowProjectNo ?? "—"} />
            <Row label="Region" value={capexRequest.region ?? "—"} />
            <Row label="Country" value={capexRequest.country ?? "—"} />
            <Row label="Description" value={capexRequest.projectDescription ?? "—"} />
            <Row label="Business Justification" value={capexRequest.businessJustification ?? "—"} />
            <Row
              label="Current Status"
              value={
                member.status === "Approved"
                  ? "You have already Approved this request."
                  : member.status === "Rejected"
                  ? "You have already Rejected this request."
                  : "Awaiting your decision"
              }
            />
          </div>

          {member.status === "Pending" && (
            <EcActions token={params.token} />
          )}

          {member.status !== "Pending" && (
            <div className={`rounded-lg p-4 text-center font-medium ${
              member.status === "Approved"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              This request has been {member.status}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex px-4 py-3 gap-4">
      <span className="text-sm font-medium text-gray-500 w-48 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

function EcActions({ token }: { token: string }) {
  return (
    <form
      action={`/api/ec/${token}`}
      method="POST"
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comments (optional)
        </label>
        <textarea
          name="comments"
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your comments here..."
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          name="decision"
          value="Approved"
          className="flex-1 h-11 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="Rejected"
          className="flex-1 h-11 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
        >
          Reject
        </button>
      </div>
    </form>
  );
}
