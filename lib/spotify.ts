const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
export const SCOPES = "user-read-recently-played";

const basicAuth = () =>
  "Basic " +
  Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

export function authorizeUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spotify token error ${res.status}: ${await res.text()}`);
  return (await res.json()) as { access_token: string; refresh_token?: string };
}

export const exchangeCode = (code: string) =>
  tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
  });

export const refreshAccessToken = (refreshToken: string) =>
  tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });

async function api<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spotify API ${path} failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const getMe = (accessToken: string) =>
  api<{ id: string; display_name: string | null }>("/me", accessToken);

type RecentItem = {
  played_at: string;
  track: {
    id: string | null;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
  };
};

export async function getRecentlyPlayed(accessToken: string) {
  const data = await api<{ items: RecentItem[] }>("/me/player/recently-played?limit=50", accessToken);
  return data.items;
}
