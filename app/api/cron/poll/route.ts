import { supabase } from "@/lib/supabase";
import { refreshAccessToken } from "@/lib/spotify";
import { savePlays } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called hourly by GitHub Actions (see .github/workflows/poll.yml).
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = supabase();
  const { data: accounts, error } = await db.from("spotify_accounts").select("spotify_id, refresh_token");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results: Record<string, string> = {};
  for (const a of accounts ?? []) {
    try {
      const t = await refreshAccessToken(a.refresh_token);
      if (t.refresh_token && t.refresh_token !== a.refresh_token) {
        await db.from("spotify_accounts").update({ refresh_token: t.refresh_token }).eq("spotify_id", a.spotify_id);
      }
      const n = await savePlays(a.spotify_id, t.access_token);
      results[a.spotify_id] = `ok (${n} plays checked)`;
    } catch (e) {
      results[a.spotify_id] = `error: ${(e as Error).message}`;
    }
  }
  return Response.json(results);
}
