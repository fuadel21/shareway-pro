import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props} />
  );
}

function RideCardSkeleton() {
  return (
    <div className="bg-white border rounded-lg p-4 mb-3 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-64 mb-3" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-24 w-full mb-4" />
      <Skeleton className="h-10 w-full mb-2" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function RideDetailsSkeleton() {
  return (
    <div className="p-4">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-64 w-full mb-4 rounded-lg" />
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 flex-1" />
        </div>
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 flex-1" />
        </div>
      </div>
      <Skeleton className="h-20 w-full mb-4" />
      <Skeleton className="h-6 w-32 mb-3" />
      {[1, 2].map(i => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
      <Skeleton className="h-12 w-full mt-6" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4">
      <Skeleton className="h-10 w-full mb-4 rounded-lg" />
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      {[1, 2, 3, 4].map(i => (
        <RideCardSkeleton key={i} />
      ))}
    </div>
  );
}

export { Skeleton, RideCardSkeleton, ProfileSkeleton, RideDetailsSkeleton, DashboardSkeleton }

