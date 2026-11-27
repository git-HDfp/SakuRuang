import { SkeletonBlock } from "@/components/ui/empty-state";

export default function WalletsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-52" />
        <SkeletonBlock className="h-10 w-44 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SkeletonBlock className="h-44 rounded-[24px]" />
        <SkeletonBlock className="h-44 rounded-[24px]" />
        <SkeletonBlock className="h-44 rounded-[24px]" />
      </div>
    </div>
  );
}
