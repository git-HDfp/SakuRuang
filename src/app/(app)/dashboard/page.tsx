import { redirect } from "next/navigation";
import {
  getAppSessionContext,
  getSpaceAnalytics,
  getSpaceBudgetsWithProgress,
  getSpaceSplitBills,
  getSpaceTransactions,
} from "@/lib/data/repository";
import { getCurrentMonthKey } from "@/lib/format";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getAppSessionContext();
  if (!session) {
    redirect("/login");
  }

  const currentMonth = getCurrentMonthKey();

  const [recentTransactions, budgets, splitBills, analytics] =
    await Promise.all([
      getSpaceTransactions(session.activeSpace.id, { limit: 6 }),
      getSpaceBudgetsWithProgress(session.activeSpace.id, currentMonth),
      getSpaceSplitBills(session.activeSpace.id),
      getSpaceAnalytics(session.activeSpace.id, currentMonth),
    ]);

  return (
    <DashboardClient
      session={session}
      currentMonth={currentMonth}
      recentTransactions={recentTransactions}
      budgets={budgets}
      splitBills={splitBills}
      analytics={analytics}
    />
  );
}
