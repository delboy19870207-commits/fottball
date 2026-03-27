-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

create type position_type as enum ('GK','CB','LB','RB','CM','DM','AM','LW','RW','ST');
create type venue_type as enum ('home','away','neutral');
create type competition_type as enum ('league','cup','friendly');
create type flag_type as enum ('standout','developing','concern','injury_risk');

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

create table clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  founded_year integer,
  league_tier integer,
  country text not null default 'Wales',
  created_at timestamptz not null default now()
);

create table age_groups (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  season text not null
);

create table players (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  age_group_id uuid not null references age_groups(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  dob date,
  position position_type not null,
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  joined_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  age_group_id uuid not null references age_groups(id) on delete restrict,
  date date not null,
  opposition text not null,
  venue venue_type not null,
  our_score integer not null default 0,
  their_score integer not null default 0,
  formation text,
  competition competition_type not null default 'league',
  coach_notes text,
  created_at timestamptz not null default now()
);

create table match_player_ratings (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  minutes_played integer not null default 90,
  effort_rating integer not null check (effort_rating between 1 and 10),
  technical_rating integer not null check (technical_rating between 1 and 10),
  decision_rating integer not null check (decision_rating between 1 and 10),
  physical_rating integer not null check (physical_rating between 1 and 10),
  scored_goal boolean not null default false,
  got_assist boolean not null default false,
  unique (match_id, player_id)
);

create table training_sessions (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  age_group_id uuid not null references age_groups(id) on delete restrict,
  date date not null,
  duration_minutes integer not null default 60,
  players_attended integer not null default 0,
  focus_tags text[] not null default '{}',
  coach_notes text,
  created_at timestamptz not null default now()
);

create table session_player_flags (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  flag_type flag_type not null,
  note text
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

-- We store club membership in a join table: coach_clubs
create table coach_clubs (
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  primary key (user_id, club_id)
);

alter table clubs enable row level security;
alter table age_groups enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table match_player_ratings enable row level security;
alter table training_sessions enable row level security;
alter table session_player_flags enable row level security;
alter table coach_clubs enable row level security;

-- Helper function: check if the current user belongs to a club
create or replace function user_has_club(p_club_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from coach_clubs
    where user_id = auth.uid()
      and club_id = p_club_id
  );
$$;

-- Policies for clubs
create policy "coaches can view their club"
  on clubs for select
  using (user_has_club(id));

-- Policies for age_groups
create policy "coaches can view age groups for their club"
  on age_groups for select
  using (user_has_club(club_id));

create policy "coaches can insert age groups for their club"
  on age_groups for insert
  with check (user_has_club(club_id));

-- Policies for players
create policy "coaches can view players for their club"
  on players for select
  using (user_has_club(club_id));

create policy "coaches can insert players for their club"
  on players for insert
  with check (user_has_club(club_id));

create policy "coaches can update players for their club"
  on players for update
  using (user_has_club(club_id));

-- Policies for matches
create policy "coaches can view matches for their club"
  on matches for select
  using (user_has_club(club_id));

create policy "coaches can insert matches for their club"
  on matches for insert
  with check (user_has_club(club_id));

-- Policies for match_player_ratings
create policy "coaches can view ratings for their matches"
  on match_player_ratings for select
  using (
    exists (
      select 1 from matches m
      where m.id = match_id
        and user_has_club(m.club_id)
    )
  );

create policy "coaches can insert ratings for their matches"
  on match_player_ratings for insert
  with check (
    exists (
      select 1 from matches m
      where m.id = match_id
        and user_has_club(m.club_id)
    )
  );

-- Policies for training_sessions
create policy "coaches can view sessions for their club"
  on training_sessions for select
  using (user_has_club(club_id));

create policy "coaches can insert sessions for their club"
  on training_sessions for insert
  with check (user_has_club(club_id));

-- Policies for session_player_flags
create policy "coaches can view flags for their sessions"
  on session_player_flags for select
  using (
    exists (
      select 1 from training_sessions ts
      where ts.id = session_id
        and user_has_club(ts.club_id)
    )
  );

create policy "coaches can insert flags for their sessions"
  on session_player_flags for insert
  with check (
    exists (
      select 1 from training_sessions ts
      where ts.id = session_id
        and user_has_club(ts.club_id)
    )
  );

-- Policies for coach_clubs
create policy "coaches can view their own memberships"
  on coach_clubs for select
  using (user_id = auth.uid());
