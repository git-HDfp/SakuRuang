import { redirect } from "next/navigation";
import {
  getAppSessionContext,
  getSpaceSplitBills,
} from "@/lib/data/repository";
import { SplitBillClient } from "./split-bill-client";

export default async function SplitBillPage() {
  const session = await getAppSessionContext();
  if (!session) {
    redirect("/login");
  }

  const splitBills = await getSpaceSplitBills(session.activeSpace.id);

  return <SplitBillClient session={session} splitBills={splitBills} />;
}
