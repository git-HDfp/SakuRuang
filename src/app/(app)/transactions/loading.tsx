import { SkeletonBlock } from "@/components/ui/empty-state";

export default function TransactionsLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-10 w-40 rounded-full" />
      </div>
      <SkeletonBlock className="h-16 w-full rounded-2xl" />
      <SkeletonBlock className="h-96 w-full rounded-[24px]" />
    </div>
  );
}
