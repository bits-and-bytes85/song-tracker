import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, getMe } from "@/lib/spotify";
import { createSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { savePlays } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const home = new URL("/", new URL(process.env.SPOTIFY_REDIRECT_URI!).origin);
  const fail = (reason: string) => {
    home.searchParams.set("error", reason);
    return NextResponse.redirect(home);
  };

  const store = await cookies();
  const expected = store.get("oauth_state")?.value;
  store.delete("oauth_state");

  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) {
    return fail("login_failed");
  }

  try {
    const tokens = await exchangeCode(code);
    const me = await getMe(tokens.access_token);

    const allowed = process.env.ALLOWED_SPOTIFY_ID;
    if (allowed && me.id !== allowed) return fail("not_allowed");
    if (!tokens.refresh_token) return fail("no_refresh_token");

    const { error } = await supabase().from("spotify_accounts").upsert({
      spotify_id: me.id,
      display_name: me.display_name,
      refresh_token: tokens.refresh_token,
    });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

    await savePlays(me.id, tokens.access_token);
    await createSession(me.id);
    return NextResponse.redirect(home);
  } catch (e) {
    console.error("Auth callback failed:", e);
    return fail("login_failed");
  }
}