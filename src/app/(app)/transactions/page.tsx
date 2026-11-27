import { redirect } from "next/navigation";
import {
  getAppSessionContext,
  getSpaceTransactions,
} from "@/lib/data/repository";
import { getCurrentMonthKey } from "@/lib/format";
import { TransactionsClient } from "./transactions-client";

export default async function TransactionsPage() {
  const session = await getAppSessionContext();
  if (!session) {
    redirect("/login");
  }

  const transactions = await getSpaceTransactions(session.activeSpace.id);

  return (
    <TransactionsClient
      session={session}
      initialTransactions={transactions}
      currentMonth={getCurrentMonthKey()}
    />
  );
}
