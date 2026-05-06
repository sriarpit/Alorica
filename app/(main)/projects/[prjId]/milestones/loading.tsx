import { Skeleton } from "@/components/ui/skeleton";

export default function MilestonesLoading() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-5 w-64" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
