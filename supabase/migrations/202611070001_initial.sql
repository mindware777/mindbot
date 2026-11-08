begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member' check (char_length(display_name) between 1 and 80)
);
create table public.article_refs (id uuid primary key, created_at timestamptz not null default now());
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.article_refs(id),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hidden boolean not null default false
);
create index comments_article_page on public.comments(article_id, created_at, id) where not hidden;
create index comments_author on public.comments(author_id, created_at desc);
alter table public.profiles enable row level security;
alter table public.article_refs enable row level security;
alter table public.comments enable row level security;
revoke all on public.profiles, public.article_refs, public.comments from anon, authenticated;
grant select on public.profiles, public.comments to anon, authenticated;
grant update(display_name) on public.profiles to authenticated;
grant insert(article_id, author_id, body), update(body), delete on public.comments to authenticated;
grant all on public.profiles, public.article_refs, public.comments to service_role;
create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_edit on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy comments_read on public.comments for select to anon, authenticated using (not hidden);
create policy comments_add on public.comments for insert to authenticated with check (author_id = (select auth.uid()) and not hidden);
create policy comments_edit on public.comments for update to authenticated using (author_id = (select auth.uid()) and not hidden) with check (author_id = (select auth.uid()) and not hidden);
create policy comments_remove on public.comments for delete to authenticated using (author_id = (select auth.uid()));
create function public.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(nullif(left(trim(new.raw_user_meta_data->>'full_name'),80),''),'Member'));
  return new;
end;
$$;
revoke all on function public.create_profile() from public, anon, authenticated;
create trigger auth_user_profile after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(id, display_name) select id, 'Member' from auth.users on conflict do nothing;
-- Serialize posting per user by locking the profile row. The timestamp on the
-- profile is private state so deleting a comment cannot bypass the cooldown.
create table public.comment_rate_limits (user_id uuid primary key references auth.users(id) on delete cascade, last_post_at timestamptz not null);
alter table public.comment_rate_limits enable row level security;
revoke all on public.comment_rate_limits from public, anon, authenticated;
create function public.enforce_comment_write() returns trigger language plpgsql security definer set search_path = '' as $$
declare last_post timestamptz;
begin
  if TG_OP = 'INSERT' then
    perform 1 from public.profiles where id = new.author_id for update;
    select last_post_at into last_post from public.comment_rate_limits where user_id = new.author_id;
    if last_post > clock_timestamp() - interval '30 seconds' then
      raise exception 'Please wait 30 seconds between comments.' using errcode = 'P0001';
    end if;
    insert into public.comment_rate_limits values (new.author_id, clock_timestamp())
      on conflict (user_id) do update set last_post_at = excluded.last_post_at;
  end if;
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
revoke all on function public.enforce_comment_write() from public, anon, authenticated;
create trigger comment_write before insert or update on public.comments for each row execute function public.enforce_comment_write();
commit;
