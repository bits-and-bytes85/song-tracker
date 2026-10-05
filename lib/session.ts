import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);
const MAX_AGE = 60 * 60 * 24 * 30;

export async function createSession(spotifyId: string) {
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(spotifyId)
    .setExpirationTime("30d")
    .sign(key());
  (await cookies()).set("session", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<string | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete("session");
}
