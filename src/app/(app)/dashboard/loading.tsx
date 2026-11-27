import { SkeletonBlock } from "@/components/ui/empty-state";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-11 w-44 rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <SkeletonBlock className="lg:col-span-7 h-64 rounded-[24px]" />
        <SkeletonBlock className="lg:col-span-5 h-64 rounded-[24px]" />
        <SkeletonBlock className="lg:col-span-7 h-80 rounded-[24px]" />
        <SkeletonBlock className="lg:col-span-5 h-80 rounded-[24px]" />
      </div>
    </div>
  );
}
