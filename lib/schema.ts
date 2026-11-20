export const SCHEMA_STATEMENTS: string[] = [
  `create table if not exists admin_auth (
    id integer primary key default 1,
    password_hash text not null,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists sessions (
    token_hash text primary key,
    admin_id integer default 1,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists login_attempts (
    id bigserial primary key,
    ip text not null default 'global',
    at timestamptz not null default now()
  )`,
  `create table if not exists board (
    id integer primary key,
    rev bigint not null default 0,
    stage text not null default 'setup',
    session_no integer not null default 0,
    name_a text not null default '',
    name_b text not null default '',
    score_a integer not null default 0,
    score_b integer not null default 0,
    history jsonb not null default '[]'::jsonb,
    results jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists photos (
    side integer primary key check (side in (0, 1)),
    mime text not null,
    bytes bytea not null,
    rev bigint not null default 1,
    updated_at timestamptz not null default now()
  )`,
  `insert into board (id) values (1) on conflict (id) do nothing`,
];
