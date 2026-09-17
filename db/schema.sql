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
  phone text
);
create index if not exists players_team_id_idx on players(team_id);

create table if not exists matches (
  id text primary key,
  round text not null,
  position int not null,
  home_team_id uuid references teams(id) on delete set null,
  away_team_id uuid references teams(id) on delete set null,
  status text not null default 'scheduled'
);

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
