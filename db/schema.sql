create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'organizer' check (role in ('admin', 'organizer')),
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  responsible text not null,
  phone text,
  email text,
  payment text check (payment in ('avista', 'parcelado')),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'partial', 'paid', 'awaiting_checkout')),
  access_token text not null unique,
  champion boolean not null default false,
  position int,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  sort_order int not null,
  name text,
  phone text,
  active boolean not null default true
);
alter table players add column if not exists active boolean not null default true;
create index if not exists players_team_id_idx on players(team_id);

create table if not exists matches (
  id text primary key,
  round text not null,
  position int not null,
  home_team_id uuid references teams(id) on delete set null,
  away_team_id uuid references teams(id) on delete set null,
  status text not null default 'scheduled',
  home_score int,
  away_score int
);
alter table matches add column if not exists home_score int;
alter table matches add column if not exists away_score int;
alter table matches drop constraint if exists matches_status_check;
alter table matches add constraint matches_status_check check (status in ('scheduled', 'finished'));

create table if not exists match_player_stats (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  is_goalkeeper boolean not null default false,
  mvp boolean not null default false,
  goals int not null default 0,
  penalty_goals int not null default 0,
  shots_on_target int not null default 0,
  shots_off_target int not null default 0,
  assists int not null default 0,
  saves int not null default 0,
  difficult_saves int not null default 0,
  goals_conceded int not null default 0,
  tackles int not null default 0,
  interceptions int not null default 0,
  fouls_committed int not null default 0,
  fouls_suffered int not null default 0,
  penalties_committed int not null default 0,
  penalties_suffered int not null default 0,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  unique (match_id, player_id)
);
create index if not exists match_player_stats_match_id_idx on match_player_stats(match_id);
create index if not exists match_player_stats_player_id_idx on match_player_stats(player_id);

create table if not exists settings (
  id boolean primary key default true check (id),
  authorized_team_limit int not null default 24
);
insert into settings (id, authorized_team_limit) values (true, 24) on conflict (id) do nothing;

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
