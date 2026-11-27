import { redirect } from "next/navigation";
import { getAppSessionContext } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/app-shell";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSessionContext();
  if (!session) {
    redirect("/login");
  }

  return <AppShell session={session}>{children}</AppShell>;
}
