"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { localDay } from "@/lib/days";

export async function saveMood(formData: FormData) {
  const id = await getSession();
  if (!id) return;

  const mood = Number(formData.get("mood"));
  if (!Number.isInteger(mood) || mood < 1 || mood > 5) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 280) || null;

  await supabase().from("moods").upsert({ spotify_id: id, day: localDay(), mood, note });
  revalidatePath("/");
}
