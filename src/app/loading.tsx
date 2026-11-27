export default function HomeLoading() {
  return (
    <div className="min-h-[100dvh] bg-[#F6F7F4] text-[#141916]">
      <div className="h-[68px] border-b border-[#141916]/[0.08] px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-between">
        <div className="h-8 w-36 rounded-xl bg-[#EFEFE9] animate-pulse" />
        <div className="h-9 w-44 rounded-full bg-[#EFEFE9] animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <div className="h-7 w-64 rounded-full bg-[#EFEFE9] animate-pulse" />
          <div className="h-14 w-full rounded-2xl bg-[#EFEFE9] animate-pulse" />
          <div className="h-14 w-4/5 rounded-2xl bg-[#EFEFE9] animate-pulse" />
          <div className="h-16 w-full rounded-xl bg-[#EFEFE9] animate-pulse" />
          <div className="flex gap-3 pt-2">
            <div className="h-12 w-40 rounded-full bg-[#EFEFE9] animate-pulse" />
            <div className="h-12 w-40 rounded-full bg-[#EFEFE9] animate-pulse" />
          </div>
        </div>
        <div className="lg:col-span-6">
          <div className="h-[460px] w-full rounded-[28px] bg-[#EFEFE9] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
