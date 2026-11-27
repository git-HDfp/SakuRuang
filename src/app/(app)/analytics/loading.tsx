import { SkeletonBlock } from "@/components/ui/empty-state";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-10 w-40 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <SkeletonBlock className="lg:col-span-7 h-80 rounded-[24px]" />
        <SkeletonBlock className="lg:col-span-5 h-80 rounded-[24px]" />
        <SkeletonBlock className="lg:col-span-6 h-72 rounded-[24px]" />
        <SkeletonBlock className="lg:col-span-6 h-72 rounded-[24px]" />
      </div>
    </div>
  );
}
