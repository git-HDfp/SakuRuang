import { SkeletonBlock } from "@/components/ui/empty-state";

export default function BudgetsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-10 w-44 rounded-full" />
      </div>
      <SkeletonBlock className="h-36 w-full rounded-[24px]" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SkeletonBlock className="h-44 rounded-[24px]" />
        <SkeletonBlock className="h-44 rounded-[24px]" />
      </div>
    </div>
  );
}
