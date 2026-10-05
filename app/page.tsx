import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { localDay, shiftDay, prettyDay, TZ } from "@/lib/days";
import { saveMood } from "./actions";

export const dynamic = "force-dynamic";

type Top = {
  day: string;
  track_id: string;
  track_name: string;
  artist_names: string;
  image_url: string | null;
  play_count: number;
  total_plays: number;
};
type Mood = { day: string; mood: number; note: string | null };

const LABELS = ["Low", "Meh", "Okay", "Good", "Great"];
const COLORS = ["#2f3e8f", "#4f8fb0", "#a9b8a0", "#e8b04b", "#e8604c"];
const moodColor = (m?: number) => (m ? COLORS[m - 1] : "transparent");

const ERRORS: Record<string, string> = {
  login_failed: "Spotify login didn't complete. Try again.",
  not_allowed: "That Spotify account isn't allowed to use this app.",
  no_refresh_token: "Spotify didn't return a refresh token. Try connecting again.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const id = await getSession();

  if (!id) {
    return (
      <main className="wrap">
        <h1 className="title">Heavy Rotation</h1>
        <p className="lede">The song you played most each day, next to how you felt. Watch your taste shift over time.</p>
        {error && <p className="error">{ERRORS[error] ?? "Something went wrong."}</p>}
        <a className="btn" href="/api/auth/login">Connect Spotify</a>
      </main>
    );
  }

  const db = supabase();
  const today = localDay();
  const since = shiftDay(today, -29);

  const [tops, moods, acct] = await Promise.all([
    db.rpc("daily_top", { p_spotify_id: id, p_tz: TZ, p_days: 30 }),
    db.from("moods").select("day, mood, note").eq("spotify_id", id).gte("day", since),
    db.from("spotify_accounts").select("display_name").eq("spotify_id", id).maybeSingle(),
  ]);

  const topMap = new Map<string, Top>(((tops.data ?? []) as Top[]).map((t) => [t.day, t]));
  const moodMap = new Map<string, Mood>(((moods.data ?? []) as Mood[]).map((m) => [m.day, m]));

  const todayTop = topMap.get(today);
  const todayMood = moodMap.get(today);
  const past = Array.from({ length: 29 }, (_, i) => shiftDay(today, -(i + 1)));

  return (
    <main className="wrap">
      <header className="head">
        <h1 className="title">Heavy Rotation</h1>
        <form action="/api/auth/logout" method="post">
          <button className="link" type="submit">Sign out</button>
        </form>
      </header>

      <section className="today">
        <div className="art">
          {todayTop?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={todayTop.image_url} alt="" />
          ) : (
            <div className="art-empty" />
          )}
        </div>
        <div className="today-body">
          <p className="meta">{prettyDay(today)}</p>
          {todayTop ? (
            <>
              <h2 className="track">{todayTop.track_name}</h2>
              <p className="artist">{todayTop.artist_names}</p>
              <p className="meta">
                Played {todayTop.play_count}× of {todayTop.total_plays} plays so far today
              </p>
            </>
          ) : (
            <>
              <h2 className="track">Nothing logged yet</h2>
              <p className="meta">Play something on Spotify. New plays are picked up every hour.</p>
            </>
          )}

          <form action={saveMood} className="mood-form">
            <fieldset>
              <legend>How are you feeling today?</legend>
              <div className="moods">
                {LABELS.map((label, i) => (
                  <div className="mood" key={label} style={{ "--c": COLORS[i] } as React.CSSProperties}>
                    <input
                      type="radio"
                      name="mood"
                      id={`m${i + 1}`}
                      value={i + 1}
                      defaultChecked={todayMood?.mood === i + 1}
                      required
                    />
                    <label htmlFor={`m${i + 1}`}>{label}</label>
                  </div>
                ))}
              </div>
            </fieldset>
            <textarea name="note" maxLength={280} rows={2} placeholder="Anything worth remembering about today?" defaultValue={todayMood?.note ?? ""} />
            <button className="btn" type="submit">{todayMood ? "Update today's mood" : "Save today's mood"}</button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="section">Last 30 days</h2>
        <ul className="grid">
          {past.map((day) => {
            const t = topMap.get(day);
            const m = moodMap.get(day);
            return (
              <li key={day} className={t ? "tile" : "tile empty"} style={{ "--c": moodColor(m?.mood) } as React.CSSProperties}>
                {t?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image_url} alt="" loading="lazy" />
                ) : (
                  <div className="art-empty" />
                )}
                <div className="bar" />
                <p className="tile-day">{prettyDay(day)}{m ? ` · ${LABELS[m.mood - 1]}` : ""}</p>
                <p className="tile-track" title={t ? `${t.track_name} — ${t.artist_names}` : undefined}>
                  {t ? t.track_name : "No plays"}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="foot">
        Signed in as {acct.data?.display_name ?? id} (Spotify ID: {id}) · days follow {TZ}
      </footer>
    </main>
  );
}
