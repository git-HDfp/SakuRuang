import { redirect } from "next/navigation";
import {
  getAppSessionContext,
  getSpaceAnalytics,
  getSpaceTransactions,
} from "@/lib/data/repository";
import { getCurrentMonthKey } from "@/lib/format";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getAppSessionContext();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : getCurrentMonthKey();

  const [analytics, transactions] = await Promise.all([
    getSpaceAnalytics(session.activeSpace.id, month),
    getSpaceTransactions(session.activeSpace.id),
  ]);

  return (
    <AnalyticsClient
      session={session}
      selectedMonth={month}
      analytics={analytics}
      transactions={transactions}
    />
  );
}
