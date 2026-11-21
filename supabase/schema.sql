-- Notes — Supabase schema
--
-- Run this whole file once in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- Design:
--   * Supabase Auth owns accounts and passwords. This schema stores only
--     notes, folders and version history.
--   * Every row has user_id = auth.uid() and Row Level Security is enabled.
--     The public anon key cannot read or write another account's data.
--   * Timestamps are Unix epoch milliseconds (bigint) to match the frontend.
--   * Composite foreign keys make it impossible to attach a note to another
--     user's folder, or a version to another user's note.
--
-- Requires PostgreSQL 15+ (all current Supabase projects).
-- Safe to re-run: tables/indexes use IF NOT EXISTS, triggers/policies are
-- dropped and recreated.

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  constraint folders_id_user_unique unique (id, user_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  html text not null default '' check (char_length(html) <= 1000000),
  folder_id uuid,
  starred boolean not null default false,
  trashed boolean not null default false,
  pinned boolean not null default false,
  archived boolean not null default false,
  tags text[] not null default '{}'
    check (array_length(tags, 1) is null or array_length(tags, 1) <= 12),
  daily text
    check (daily is null or daily ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  constraint notes_id_user_unique unique (id, user_id),
  constraint notes_folder_fk
    foreign key (folder_id, user_id)
    references public.folders (id, user_id)
    on delete set null (folder_id)
);

create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  note_id uuid not null,
  title text not null default '' check (char_length(title) <= 200),
  html text not null default '' check (char_length(html) <= 1000000),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  constraint note_versions_note_fk
    foreign key (note_id, user_id)
    references public.notes (id, user_id)
    on delete cascade
);

/* ------------------------------------------------------------------ */
/* Indexes                                                             */
/* ------------------------------------------------------------------ */

create index if not exists folders_user_created_idx
  on public.folders (user_id, created_at);

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create index if not exists notes_user_folder_idx
  on public.notes (user_id, folder_id);

create index if not exists notes_user_trashed_idx
  on public.notes (user_id, trashed);

create index if not exists note_versions_user_note_created_idx
  on public.note_versions (user_id, note_id, created_at desc);

/* ------------------------------------------------------------------ */
/* updated_at trigger                                                  */
/* ------------------------------------------------------------------ */

create or replace function public.notes_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end;
$$;

drop trigger if exists folders_touch_updated_at on public.folders;
create trigger folders_touch_updated_at
  before update on public.folders
  for each row execute function public.notes_touch_updated_at();

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.notes_touch_updated_at();

/* ------------------------------------------------------------------ */
/* Row Level Security                                                  */
/* ------------------------------------------------------------------ */

alter table public.folders enable row level security;
alter table public.notes enable row level security;
alter table public.note_versions enable row level security;

/* Folders: owners only. */
drop policy if exists folders_select_own on public.folders;
create policy folders_select_own on public.folders
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists folders_insert_own on public.folders;
create policy folders_insert_own on public.folders
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists folders_update_own on public.folders;
create policy folders_update_own on public.folders
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists folders_delete_own on public.folders;
create policy folders_delete_own on public.folders
  for delete to authenticated
  using (user_id = auth.uid());

/* Notes: owners only. */
drop policy if exists notes_select_own on public.notes;
create policy notes_select_own on public.notes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notes_insert_own on public.notes;
create policy notes_insert_own on public.notes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists notes_update_own on public.notes;
create policy notes_update_own on public.notes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notes_delete_own on public.notes;
create policy notes_delete_own on public.notes
  for delete to authenticated
  using (user_id = auth.uid());

/* Versions: owners only. The composite FK also proves note ownership. */
drop policy if exists note_versions_select_own on public.note_versions;
create policy note_versions_select_own on public.note_versions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists note_versions_insert_own on public.note_versions;
create policy note_versions_insert_own on public.note_versions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists note_versions_delete_own on public.note_versions;
create policy note_versions_delete_own on public.note_versions
  for delete to authenticated
  using (user_id = auth.uid());

/* Versions are immutable from the app's point of view; no update policy. */

/* ------------------------------------------------------------------ */
/* Privileges                                                          */
/* ------------------------------------------------------------------ */

-- Signed-out visitors must not touch the tables at all, even before RLS.
revoke all on public.folders from anon;
revoke all on public.notes from anon;
revoke all on public.note_versions from anon;

-- Signed-in users get normal CRUD; RLS still limits them to their own rows.
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, delete on public.note_versions to authenticated;

-- The service_role bypasses RLS and is only used from trusted server code.
grant all on public.folders to service_role;
grant all on public.notes to service_role;
grant all on public.note_versions to service_role;
