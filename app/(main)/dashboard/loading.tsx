import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-2 w-full rounded-full mt-4" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Filter bar skeleton */}
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-md" />
        ))}
        <Skeleton className="h-9 w-48 rounded-md ml-auto" />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="min-w-[260px] space-y-3">
            <Skeleton className="h-7 w-40 rounded" />
            {Array.from({ length: 3 }).map((_, card) => (
              <CardSkeleton key={card} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
