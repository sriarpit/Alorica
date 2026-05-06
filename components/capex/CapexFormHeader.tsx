interface CapexFormHeaderProps {
  prjNumber: string;
  projectName: string;
  managerName: string | null;
  goLiveDate: string | null;
  capexState?: string;
}

const STATE_COLORS: Record<string, string> = {
  Draft: "bg-yellow-100 text-yellow-700",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  InProgress: "bg-blue-100 text-blue-700",
};

export function CapexFormHeader({
  prjNumber,
  projectName,
  managerName,
  goLiveDate,
  capexState,
}: CapexFormHeaderProps) {
  const formattedDate = goLiveDate
    ? new Date(goLiveDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="bg-[#0f1e35] rounded-lg px-6 py-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 flex-1">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Project No.</p>
            <p className="text-white font-mono font-semibold mt-0.5">{prjNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Project Name</p>
            <p className="text-white font-medium mt-0.5 truncate max-w-[200px]" title={projectName}>
              {projectName}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Project Manager</p>
            <p className="text-white font-medium mt-0.5">{managerName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Go-Live Date</p>
            <p className="text-white font-medium mt-0.5">{formattedDate}</p>
          </div>
        </div>
        {capexState && (
          <div
            className={`ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              STATE_COLORS[capexState] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {capexState}
          </div>
        )}
      </div>
    </div>
  );
}
