import { redirect } from "next/navigation";
import { getAppSessionContext } from "@/lib/data/repository";
import { WalletsClient } from "./wallets-client";

export default async function WalletsPage() {
  const session = await getAppSessionContext();
  if (!session) {
    redirect("/login");
  }

  return <WalletsClient session={session} />;
}
