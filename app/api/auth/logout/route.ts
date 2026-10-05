import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return NextResponse.redirect(new URL("/", new URL(process.env.SPOTIFY_REDIRECT_URI!).origin), 303);
}
