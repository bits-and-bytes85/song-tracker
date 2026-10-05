# Heavy Rotation

Logs your most-played Spotify song each day next to a 1-5 mood score.

## How it works
- Spotify only exposes your last ~50 plays, so a scheduled job (GitHub Actions, hourly) calls
  `POST /api/cron/poll`, which stores new plays in Supabase.
- `daily_top()` (SQL function in `supabase/schema.sql`) picks each day's most-played track in your timezone.
- Mood entries live in the `moods` table. One per day.

## Local setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. `npm run dev`, then open http://127.0.0.1:3000 (use 127.0.0.1, not localhost).

See the chat instructions for deployment.
