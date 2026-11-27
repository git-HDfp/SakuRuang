import { redirect } from "next/navigation";
import {
  getAppSessionContext,
  getSpaceInvites,
} from "@/lib/data/repository";
import { FamilyClient } from "./family-client";

export default async function FamilyPage() {
  const session = await getAppSessionContext();
  if (!session) {
    redirect("/login");
  }

  const invites = await getSpaceInvites(session.activeSpace.id);

  return <FamilyClient session={session} invites={invites} />;
}
