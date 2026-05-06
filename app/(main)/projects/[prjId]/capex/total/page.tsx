import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CapexFormHeader } from "@/components/capex/CapexFormHeader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-US");
}

function costPerSeat(total: unknown, seats: unknown): string {
  const t = Number(total);
  const s = Number(seats);
  if (!t || !s) return "—";
  return `$${(t / s).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function TotalPage({ params }: { params: { prjId: string } }) {
  const project = await db.project.findUnique({
    where: { id: params.prjId },
    include: { projectManager: { select: { id: true, name: true } } },
  });
  if (!project) notFound();

  const capex = await db.capexRequest.findFirst({
    where: { projectId: params.prjId, isActive: true },
    include: { sectionDetails: true },
    orderBy: { createdOn: "desc" },
  });

  const sd = capex?.sectionDetails;

  // Compute totals
  const itTotal = [
    sd?.infrastructureCostTotal,
    sd?.eusCostTotal,
    sd?.capitalLaborCostTotal,
  ].reduce((sum, v) => sum + (Number(v) || 0), 0);

  const facGross = [
    sd?.construction,
    sd?.electricalCabling,
    sd?.furnitureFixture,
    sd?.others,
  ].reduce((sum, v) => sum + (Number(v) || 0), 0);
  const tia = Number(sd?.tenantImprovementAllowance) || 0;
  const facNet = facGross + tia;

  const secTotal = Number(sd?.securityTotal) || 0;
  const grandTotal = itTotal + facNet + secTotal;

  const itSeats = [
    sd?.infrastructureCostSeats,
    sd?.eusCostSeats,
    sd?.capitalLaborCostSeats,
  ].reduce((sum: number, v) => sum + (Number(v) || 0), 0);

  const facSeats = [
    sd?.constructionSeats,
    sd?.electricalCablingSeats,
    sd?.furnitureFixtureSeats,
    sd?.othersSeats,
  ].reduce((sum: number, v) => sum + (Number(v) || 0), 0);

  const secSeats = Number(sd?.securitySeats) || 0;
  const totalSeats = itSeats + facSeats + secSeats;

  const rows = [
    { label: "IT", total: itTotal, seats: itSeats },
    { label: "Facilities (Net of TIA)", total: facNet, seats: facSeats },
    { label: "Physical Security", total: secTotal, seats: secSeats },
  ];

  return (
    <div className="space-y-6">
      <CapexFormHeader
        prjNumber={project.prjNumber}
        projectName={project.name}
        managerName={project.projectManager?.name ?? null}
        goLiveDate={project.goLiveDate?.toISOString() ?? null}
        capexState={capex?.state ?? "Draft"}
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-6 pb-2 border-b border-gray-200">
          Grand Total Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-48">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Total ($)</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Seats / Hours</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Cost per Seat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.label} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    {fmt(row.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {fmtNum(row.seats || null)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {costPerSeat(row.total, row.seats)}
                  </td>
                </tr>
              ))}
              {/* Grand Total */}
              <tr className="bg-[#0f1e35] text-white font-semibold">
                <td className="px-4 py-3">Grand Total</td>
                <td className="px-4 py-3 text-right">
                  ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right">
                  {totalSeats > 0 ? totalSeats.toLocaleString("en-US") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {costPerSeat(grandTotal, totalSeats)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {grandTotal > 25000 && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
            <span className="font-semibold">Note:</span>
            Grand Total exceeds $25,000 — Executive Committee approval will be required in Finance Review.
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Link href={`/projects/${params.prjId}/capex/finance-review`}>
          <Button className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]">
            Continue to Finance Review <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
