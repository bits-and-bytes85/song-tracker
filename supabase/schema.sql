-- Run this once in Supabase: SQL Editor > New query > paste > Run

create table if not exists spotify_accounts (
  spotify_id    text primary key,
  display_name  text,
  refresh_token text not null,
  created_at    timestamptz not null default now()
);

create table if not exists plays (
  id           bigint generated always as identity primary key,
  spotify_id   text not null references spotify_accounts(spotify_id) on delete cascade,
  played_at    timestamptz not null,
  track_id     text not null,
  track_name   text not null,
  artist_names text not null,
  album_name   text,
  image_url    text,
  unique (spotify_id, played_at, track_id)
);
create index if not exists plays_user_time on plays (spotify_id, played_at desc);

create table if not exists moods (
  spotify_id text not null references spotify_accounts(spotify_id) on delete cascade,
  day        date not null,
  mood       smallint not null check (mood between 1 and 5),
  note       text,
  primary key (spotify_id, day)
);

-- Lock the tables down. The app uses the service role key (server only),
-- which bypasses RLS; the public anon key gets no access at all.
alter table spotify_accounts enable row level security;
alter table plays enable row level security;
alter table moods enable row level security;

-- Most-played track per local day (ties go to the most recently played).
create or replace function daily_top(p_spotify_id text, p_tz text, p_days int)
returns table (
  day date, track_id text, track_name text, artist_names text,
  image_url text, play_count bigint, total_plays bigint
)
language sql stable as $$
  with p as (
    select (played_at at time zone p_tz)::date as day,
           played_at, track_id, track_name, artist_names, image_url
    from plays
    where spotify_id = p_spotify_id
      and played_at >= now() - make_interval(days => p_days + 1)
  ),
  c as (
    select day, track_id,
           max(track_name)   as track_name,
           max(artist_names) as artist_names,
           max(image_url)    as image_url,
           count(*)          as play_count,
           max(played_at)    as last_played
    from p
    group by day, track_id
  ),
  r as (
    select c.*,
           row_number() over (partition by day order by play_count desc, last_played desc) as rn,
           sum(play_count) over (partition by day) as total_plays
    from c
  )
  select day, track_id, track_name, artist_names, image_url, play_count, total_plays::bigint
  from r
  where rn = 1
  order by day desc;
$$;
