import { Skeleton } from "@/components/ui/skeleton";

export default function CapexLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-[#0f1e35] rounded-lg px-6 py-4 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-64 bg-white/20" />
          <Skeleton className="h-3.5 w-48 bg-white/10" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full bg-white/20" />
      </div>

      {/* Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Second section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <Skeleton className="h-5 w-52" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-md" />
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}
