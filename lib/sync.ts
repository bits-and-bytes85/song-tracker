import { supabase } from "./supabase";
import { getRecentlyPlayed } from "./spotify";

/** Fetch the last ~50 plays and store any we haven't seen. Returns rows submitted. */
export async function savePlays(spotifyId: string, accessToken: string): Promise<number> {
  const items = await getRecentlyPlayed(accessToken);
  const rows = items
    .filter((i) => i.track.id) // skip local files
    .map((i) => ({
      spotify_id: spotifyId,
      played_at: i.played_at,
      track_id: i.track.id as string,
      track_name: i.track.name,
      artist_names: i.track.artists.map((a) => a.name).join(", "),
      album_name: i.track.album.name,
      image_url: i.track.album.images[1]?.url ?? i.track.album.images[0]?.url ?? null,
    }));
  if (rows.length === 0) return 0;

  const { error } = await supabase()
    .from("plays")
    .upsert(rows, { onConflict: "spotify_id,played_at,track_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return rows.length;
}
