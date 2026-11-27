import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/")
      ? `/login?next=${encodeURIComponent(params.next)}`
      : "/login";

  redirect(nextPath);
}
