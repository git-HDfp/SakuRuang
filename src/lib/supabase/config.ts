export const COOKIE_ACTIVE_SPACE = "sakuruang_space_id";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return false;
  if (url.includes("your-project-ref.supabase.co")) return false;
  if (key === "your-supabase-anon-key") return false;

  return url.startsWith("https://") || url.startsWith("http://");
}
