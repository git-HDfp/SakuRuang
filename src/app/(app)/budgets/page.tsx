import { redirect } from "next/navigation";
import {
  getAppSessionContext,
  getSpaceBudgetsWithProgress,
} from "@/lib/data/repository";
import { getCurrentMonthKey } from "@/lib/format";
import { BudgetsClient } from "./budgets-client";

export default async function BudgetsPage({
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

  const budgets = await getSpaceBudgetsWithProgress(
    session.activeSpace.id,
    month
  );

  return (
    <BudgetsClient session={session} selectedMonth={month} budgets={budgets} />
  );
}
