begin;

-- Freeze legacy writes while copying records into the replacement storage.
lock table public.profiles, public.article_refs, public.comments, public.comment_rate_limits in access exclusive mode;

-- Keep the initial migration as the upgrade baseline. No article body enters SQL.
create schema if not exists private;
revoke create on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

alter table public.profiles add column created_at timestamptz not null default now();
alter table public.article_refs
  add column slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add column title text check (char_length(trim(title)) between 1 and 200),
  add column published_at timestamptz,
  add column is_published boolean not null default false,
  add constraint published_article_metadata check (
    not is_published or (slug is not null and title is not null and published_at is not null)
  );

create table private.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  suspended_until timestamptz
);
insert into private.user_access(user_id) select id from public.profiles;
alter table private.user_access enable row level security;
alter table public.comment_rate_limits set schema private;
alter table private.comment_rate_limits rename to write_rate_limits;

create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('article', 'community')),
  article_id uuid unique references public.article_refs(id),
  author_id uuid references public.profiles(id) on delete set null,
  title text check (char_length(trim(title)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_locked boolean not null default false,
  is_pinned boolean not null default false,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  next_post_number integer not null default 1 check (next_post_number > 0),
  post_count integer not null default 0 check (post_count >= 0),
  last_post_id uuid,
  last_activity_at timestamptz not null default now(),
  check ((kind = 'article' and article_id is not null and author_id is null and title is null)
      or (kind = 'community' and article_id is null and title is not null))
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  number integer not null check (number > 0),
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 20000),
  reply_to_post_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  unique (discussion_id, number),
  unique (discussion_id, id),
  foreign key (discussion_id, reply_to_post_id) references public.posts(discussion_id, id),
  check (reply_to_post_id is null or reply_to_post_id <> id)
);
alter table public.discussions add constraint discussions_last_post_fkey
  foreign key (id, last_post_id) references public.posts(discussion_id, id) deferrable initially immediate;
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (char_length(description) <= 1000),
  position integer not null default 0
);
create table public.discussion_tag (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (discussion_id, tag_id)
);
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table public.discussion_user (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_post_number integer not null default 0 check (last_read_post_number >= 0),
  last_read_at timestamptz not null default now(),
  primary key (discussion_id, user_id)
);
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'off_topic', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  unique (post_id, reporter_id),
  check ((status = 'open' and resolved_at is null) or (status <> 'open' and resolved_at is not null))
);

-- Copy before dropping legacy storage; retain UUIDs, timestamps, and hidden state.
insert into public.discussions(kind, article_id, created_at, last_activity_at)
select 'article', id, created_at, created_at from public.article_refs;
insert into public.posts(id, discussion_id, number, author_id, body, created_at, updated_at, hidden_at)
select c.id, d.id, row_number() over (partition by c.article_id order by c.created_at, c.id)::integer,
  c.author_id, c.body, c.created_at, c.updated_at,
  case when c.hidden then c.updated_at end
from public.comments c join public.discussions d on d.article_id = c.article_id;
update public.discussions d set next_post_number =
  coalesce((select max(p.number) from public.posts p where p.discussion_id = d.id), 0) + 1;
drop table public.comments;
drop function public.enforce_comment_write();

create index discussions_community_activity on public.discussions(is_pinned desc, last_activity_at desc, id desc)
  where kind = 'community' and hidden_at is null and deleted_at is null;
create index discussions_author on public.discussions(author_id, created_at desc);
create index posts_author on public.posts(author_id, created_at desc);
create index posts_visible_page on public.posts(discussion_id, number) where hidden_at is null and deleted_at is null;
create index discussion_tag_lookup on public.discussion_tag(tag_id, discussion_id);
create index post_likes_user on public.post_likes(user_id);
create index discussion_user_owner on public.discussion_user(user_id);
create index flags_open on public.flags(created_at, id) where status = 'open';

create or replace function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
    values (new.id, coalesce(nullif(left(trim(new.raw_user_meta_data->>'full_name'),80),''),'Member'));
  insert into private.user_access(user_id) values (new.id);
  return new;
end;
$$;

-- These boolean helpers do not expose the private role table through the API.
create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.user_access where user_id = auth.uid()
    and role in ('moderator', 'admin') and (suspended_until is null or suspended_until <= now()));
$$;
create function private.can_read_discussion(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.discussions d where d.id = p_id
    and d.hidden_at is null and d.deleted_at is null
    and (d.kind = 'community' or exists(select 1 from public.article_refs a where a.id = d.article_id and a.is_published)));
$$;
create function private.can_read_post(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.posts p where p.id = p_id
    and p.hidden_at is null and p.deleted_at is null and private.can_read_discussion(p.discussion_id));
$$;

-- Lock the actor before the discussion for consistent mutation lock ordering.
create function private.require_member() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_access private.user_access;
begin
  select * into v_access from private.user_access where user_id = v_actor for update;
  if not found or (v_access.suspended_until is not null and v_access.suspended_until > clock_timestamp()) then
    raise exception 'An active member session is required.' using errcode = '42501';
  end if;
  return v_actor;
end;
$$;
create function private.take_cooldown(p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from private.write_rate_limits where user_id = p_actor
    and last_post_at > clock_timestamp() - interval '30 seconds') then
    raise exception 'Please wait 30 seconds between comments.' using errcode = 'P0001';
  end if;
  insert into private.write_rate_limits(user_id, last_post_at) values (p_actor, clock_timestamp())
    on conflict (user_id) do update set last_post_at = excluded.last_post_at;
end;
$$;
create function private.lock_discussion(p_id uuid, p_allow_locked boolean default false) returns public.discussions
language plpgsql security definer set search_path = '' as $$
declare v_discussion public.discussions;
begin
  select * into v_discussion from public.discussions where id = p_id for update;
  if not found or not private.can_read_discussion(p_id) then
    raise exception 'Discussion unavailable.' using errcode = 'P0002';
  end if;
  if v_discussion.is_locked and not p_allow_locked and not private.is_staff() then
    raise exception 'This discussion is locked.' using errcode = '42501';
  end if;
  return v_discussion;
end;
$$;
create function private.refresh_discussion(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.discussions d set
    post_count = case when d.hidden_at is not null or d.deleted_at is not null then 0 else
      (select count(*) from public.posts p where p.discussion_id = d.id and p.hidden_at is null and p.deleted_at is null) end,
    last_post_id = case when d.hidden_at is not null or d.deleted_at is not null then null else
      (select p.id from public.posts p where p.discussion_id = d.id and p.hidden_at is null and p.deleted_at is null order by p.number desc limit 1) end,
    last_activity_at = case when d.hidden_at is not null or d.deleted_at is not null then d.created_at else
      coalesce((select max(p.created_at) from public.posts p where p.discussion_id = d.id and p.hidden_at is null and p.deleted_at is null), d.created_at) end,
    updated_at = clock_timestamp()
  where d.id = p_id;
end;
$$;
select private.refresh_discussion(id) from public.discussions;

create function private.set_tags(p_discussion uuid, p_tags uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_tags is null or cardinality(p_tags) > 5 or array_position(p_tags, null) is not null then
    raise exception 'Provide up to five valid tags.' using errcode = '22023';
  end if;
  delete from public.discussion_tag where discussion_id = p_discussion;
  insert into public.discussion_tag(discussion_id, tag_id)
    select p_discussion, id from (select distinct unnest(p_tags) as id) t;
end;
$$;
create function private.add_post(p_discussion uuid, p_actor uuid, p_body text, p_reply_to uuid) returns public.posts
language plpgsql security definer set search_path = '' as $$
declare v_topic public.discussions; v_post public.posts; v_limit integer;
begin
  v_topic := private.lock_discussion(p_discussion);
  v_limit := case when v_topic.kind = 'community' and v_topic.next_post_number = 1 then 20000 else 5000 end;
  if p_body is null or char_length(trim(p_body)) not between 1 and v_limit then
    raise exception 'Post body must contain 1 to % characters.', v_limit using errcode = '22023';
  end if;
  if p_reply_to is not null and not exists(select 1 from public.posts where id = p_reply_to
    and discussion_id = p_discussion and number < v_topic.next_post_number and hidden_at is null and deleted_at is null) then
    raise exception 'Reply target unavailable in this discussion.' using errcode = '22023';
  end if;
  insert into public.posts(discussion_id, number, author_id, body, reply_to_post_id)
    values (p_discussion, v_topic.next_post_number, p_actor, trim(p_body), p_reply_to) returning * into v_post;
  update public.discussions set next_post_number = next_post_number + 1 where id = p_discussion;
  perform private.refresh_discussion(p_discussion);
  return v_post;
end;
$$;

create function public.create_discussion(p_title text, p_body text, p_tag_ids uuid[] default '{}') returns public.discussions
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_topic public.discussions;
begin
  if p_title is null or char_length(trim(p_title)) not between 1 and 200 then
    raise exception 'Title must contain 1 to 200 characters.' using errcode = '22023';
  end if;
  perform private.take_cooldown(v_actor);
  insert into public.discussions(kind, author_id, title) values ('community', v_actor, trim(p_title)) returning * into v_topic;
  perform private.set_tags(v_topic.id, p_tag_ids);
  perform private.add_post(v_topic.id, v_actor, p_body, null);
  select * into v_topic from public.discussions where id = v_topic.id;
  return v_topic;
end;
$$;
create function public.reply_to_discussion(p_discussion_id uuid, p_body text, p_reply_to_post_id uuid default null) returns public.posts
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member();
begin
  perform private.take_cooldown(v_actor);
  return private.add_post(p_discussion_id, v_actor, p_body, p_reply_to_post_id);
end;
$$;
create function public.edit_discussion(p_discussion_id uuid, p_title text, p_tag_ids uuid[] default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_topic public.discussions;
begin
  v_topic := private.lock_discussion(p_discussion_id);
  if v_topic.kind <> 'community' or v_topic.author_id is distinct from v_actor then
    raise exception 'Only the topic author can edit it.' using errcode = '42501';
  end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 200 then
    raise exception 'Title must contain 1 to 200 characters.' using errcode = '22023';
  end if;
  update public.discussions set title = trim(p_title), updated_at = clock_timestamp() where id = p_discussion_id;
  perform private.set_tags(p_discussion_id, p_tag_ids);
end;
$$;
create function public.edit_post(p_post_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_post public.posts; v_topic public.discussions; v_limit integer;
begin
  select * into v_post from public.posts where id = p_post_id;
  v_topic := private.lock_discussion(v_post.discussion_id);
  select * into v_post from public.posts where id = p_post_id for update;
  if v_post.author_id is distinct from v_actor or not private.can_read_post(p_post_id) then
    raise exception 'Only the author can edit a visible post.' using errcode = '42501';
  end if;
  v_limit := case when v_topic.kind = 'community' and v_post.number = 1 then 20000 else 5000 end;
  if p_body is null or char_length(trim(p_body)) not between 1 and v_limit then
    raise exception 'Post body must contain 1 to % characters.', v_limit using errcode = '22023';
  end if;
  update public.posts set body = trim(p_body), updated_at = clock_timestamp() where id = p_post_id;
end;
$$;
create function public.delete_discussion(p_discussion_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_topic public.discussions;
begin
  v_topic := private.lock_discussion(p_discussion_id);
  if v_topic.kind <> 'community' or v_topic.author_id is distinct from v_actor then
    raise exception 'Only the topic author can remove it.' using errcode = '42501';
  end if;
  if exists(select 1 from public.posts where discussion_id = p_discussion_id and number > 1 and author_id is distinct from v_actor) then
    raise exception 'A participating topic requires moderator removal.' using errcode = '42501';
  end if;
  update public.discussions set deleted_at = clock_timestamp() where id = p_discussion_id;
  update public.posts set deleted_at = clock_timestamp(), updated_at = clock_timestamp()
    where discussion_id = p_discussion_id and number = 1;
  perform private.refresh_discussion(p_discussion_id);
end;
$$;
create function public.delete_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_post public.posts; v_topic public.discussions;
begin
  select * into v_post from public.posts where id = p_post_id;
  v_topic := private.lock_discussion(v_post.discussion_id);
  select * into v_post from public.posts where id = p_post_id for update;
  if v_post.author_id is distinct from v_actor or not private.can_read_post(p_post_id) then
    raise exception 'Only the author can delete a visible post.' using errcode = '42501';
  end if;
  if v_topic.kind = 'community' and v_post.number = 1 then
    perform public.delete_discussion(v_topic.id);
    return;
  end if;
  update public.posts set deleted_at = clock_timestamp(), updated_at = clock_timestamp() where id = p_post_id;
  perform private.refresh_discussion(v_topic.id);
end;
$$;
-- The UI can inspect its own access without exposing the role table.
create function public.get_my_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('role', role, 'suspended_until', suspended_until)
  from private.user_access where user_id = auth.uid();
$$;
create function public.update_profile(p_display_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member();
begin
  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 80 then
    raise exception 'Display name must contain 1 to 80 characters.' using errcode = '22023';
  end if;
  update public.profiles set display_name = trim(p_display_name) where id = v_actor;
end;
$$;
create function public.set_post_like(p_post_id uuid, p_liked boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_topic uuid;
begin
  select discussion_id into v_topic from public.posts where id = p_post_id;
  perform private.lock_discussion(v_topic, true);
  if p_liked is null or not private.can_read_post(p_post_id) then
    raise exception 'Post unavailable.' using errcode = '22023';
  end if;
  if p_liked then
    insert into public.post_likes(post_id, user_id) values (p_post_id, v_actor) on conflict do nothing;
  else
    delete from public.post_likes where post_id = p_post_id and user_id = v_actor;
  end if;
end;
$$;
create function public.mark_discussion_read(p_discussion_id uuid, p_post_number integer) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_max integer;
begin
  if not private.can_read_discussion(p_discussion_id) then
    raise exception 'Discussion unavailable.' using errcode = 'P0002';
  end if;
  select coalesce(max(number), 0) into v_max from public.posts where discussion_id = p_discussion_id and hidden_at is null and deleted_at is null;
  if p_post_number is null or p_post_number < 0 or p_post_number > v_max then
    raise exception 'Read position is outside the available stream.' using errcode = '22023';
  end if;
  insert into public.discussion_user(discussion_id, user_id, last_read_post_number) values (p_discussion_id, v_actor, p_post_number)
    on conflict (discussion_id, user_id) do update set last_read_post_number = excluded.last_read_post_number, last_read_at = clock_timestamp()
    where excluded.last_read_post_number > public.discussion_user.last_read_post_number;
end;
$$;
create function public.flag_post(p_post_id uuid, p_reason text, p_details text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_id uuid;
begin
  if not private.can_read_post(p_post_id) then
    raise exception 'Post unavailable.' using errcode = 'P0002';
  end if;
  insert into public.flags(post_id, reporter_id, reason, details) values (p_post_id, v_actor, p_reason, p_details)
    on conflict (post_id, reporter_id) do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.flags where post_id = p_post_id and reporter_id = v_actor; end if;
  return v_id;
end;
$$;

create function public.moderate_discussion(p_discussion_id uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_topic public.discussions;
begin
  if not private.is_staff() then raise exception 'Moderator access required.' using errcode = '42501'; end if;
  select * into v_topic from public.discussions where id = p_discussion_id for update;
  if not found or v_topic.deleted_at is not null then raise exception 'Discussion unavailable.' using errcode = 'P0002'; end if;
  case p_action
    when 'hide' then update public.discussions set hidden_at = clock_timestamp(), hidden_by = v_actor where id = p_discussion_id;
    when 'restore' then update public.discussions set hidden_at = null, hidden_by = null where id = p_discussion_id;
    when 'lock' then update public.discussions set is_locked = true where id = p_discussion_id;
    when 'unlock' then update public.discussions set is_locked = false where id = p_discussion_id;
    when 'pin' then
      if v_topic.kind <> 'community' then raise exception 'Only community topics can be pinned.' using errcode = '22023'; end if;
      update public.discussions set is_pinned = true where id = p_discussion_id;
    when 'unpin' then update public.discussions set is_pinned = false where id = p_discussion_id;
    else raise exception 'Unknown moderation action.' using errcode = '22023';
  end case;
  perform private.refresh_discussion(p_discussion_id);
end;
$$;
create function public.moderate_post(p_post_id uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_post public.posts; v_topic public.discussions;
begin
  if not private.is_staff() then raise exception 'Moderator access required.' using errcode = '42501'; end if;
  select * into v_post from public.posts where id = p_post_id;
  select * into v_topic from public.discussions where id = v_post.discussion_id for update;
  select * into v_post from public.posts where id = p_post_id for update;
  if not found or v_post.deleted_at is not null or v_topic.deleted_at is not null then raise exception 'Post unavailable.' using errcode = 'P0002'; end if;
  if p_action is null or p_action not in ('hide', 'restore') then raise exception 'Unknown moderation action.' using errcode = '22023'; end if;
  if v_topic.kind = 'community' and v_post.number = 1 then
    perform public.moderate_discussion(v_topic.id, p_action);
  else
    update public.posts set hidden_at = case when p_action = 'hide' then clock_timestamp() end,
      hidden_by = case when p_action = 'hide' then v_actor end, updated_at = clock_timestamp() where id = p_post_id;
    perform private.refresh_discussion(v_topic.id);
  end if;
end;
$$;
create function public.resolve_flag(p_flag_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member();
begin
  if not private.is_staff() then raise exception 'Moderator access required.' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('resolved', 'dismissed') then raise exception 'Invalid resolution.' using errcode = '22023'; end if;
  update public.flags set status = p_status, resolved_by = v_actor, resolved_at = clock_timestamp() where id = p_flag_id;
  if not found then raise exception 'Report unavailable.' using errcode = 'P0002'; end if;
end;
$$;
create function public.set_user_access(p_user_id uuid, p_role text, p_suspended_until timestamptz default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member();
begin
  if not exists(select 1 from private.user_access where user_id = v_actor and role = 'admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_user_id = v_actor then raise exception 'An admin cannot change their own access.' using errcode = '42501'; end if;
  update private.user_access set role = p_role, suspended_until = p_suspended_until where user_id = p_user_id;
  if not found then raise exception 'Member unavailable.' using errcode = 'P0002'; end if;
end;
$$;
create function public.save_tag(p_id uuid, p_slug text, p_name text, p_description text default null, p_position integer default 0) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_member(); v_id uuid;
begin
  if not exists(select 1 from private.user_access where user_id = v_actor and role = 'admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  insert into public.tags(id, slug, name, description, position) values (coalesce(p_id, gen_random_uuid()), p_slug, p_name, p_description, p_position)
    on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, position = excluded.position returning id into v_id;
  return v_id;
end;
$$;

-- The manifest is metadata only. Preparation preserves the currently live version.
create function private.validate_article_manifest(p_articles jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if p_articles is null or jsonb_typeof(p_articles) <> 'array' then raise exception 'Expected an article array.' using errcode = '22023'; end if;
  select count(*) into v_count from jsonb_to_recordset(p_articles) as a(id uuid, slug text, title text, published_at timestamptz)
    where id is null or slug is null or slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or title is null or char_length(trim(title)) not between 1 and 200 or published_at is null;
  if v_count > 0 then raise exception 'Invalid article metadata.' using errcode = '22023'; end if;
  select count(*) - count(distinct id) + count(*) - count(distinct slug) into v_count
    from jsonb_to_recordset(p_articles) as a(id uuid, slug text);
  if v_count > 0 then raise exception 'Duplicate article ID or slug.' using errcode = '22023'; end if;
  if exists(select 1 from jsonb_to_recordset(p_articles) as a(id uuid, slug text)
    join public.article_refs r on r.id = a.id where r.slug is not null and r.slug <> a.slug) then
    raise exception 'Published article slugs are permanent.' using errcode = '22023';
  end if;
end;
$$;
create function public.prepare_articles(p_articles jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(670701);
  perform private.validate_article_manifest(p_articles);
  insert into public.article_refs(id, slug, title, published_at)
    select id, slug, title, published_at from jsonb_to_recordset(p_articles) as a(id uuid, slug text, title text, published_at timestamptz)
    on conflict (id) do nothing;
  insert into public.discussions(kind, article_id)
    select 'article', id from jsonb_to_recordset(p_articles) as a(id uuid)
    on conflict (article_id) do nothing;
end;
$$;
create function public.activate_articles(p_articles jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(670701);
  perform private.validate_article_manifest(p_articles);
  if exists(select 1 from jsonb_to_recordset(p_articles) as a(id uuid)
    where not exists(select 1 from public.discussions where article_id = a.id)) then
    raise exception 'Prepare articles before activation.' using errcode = '22023';
  end if;
  update public.article_refs set is_published = false where is_published and id not in
    (select id from jsonb_to_recordset(p_articles) as a(id uuid));
  update public.article_refs r set slug = a.slug, title = a.title, published_at = a.published_at, is_published = true
    from jsonb_to_recordset(p_articles) as a(id uuid, slug text, title text, published_at timestamptz) where r.id = a.id;
end;
$$;

-- Remove defaults, including Supabase's default table/function grants, explicitly.
revoke all on public.profiles, public.article_refs, public.discussions, public.posts, public.tags,
  public.discussion_tag, public.post_likes, public.discussion_user, public.flags from public, anon, authenticated, service_role;
revoke all on private.user_access, private.write_rate_limits from public, anon, authenticated, service_role;
grant select on public.profiles, public.article_refs, public.discussions, public.posts, public.tags,
  public.discussion_tag, public.post_likes to anon, authenticated;
grant select on public.discussion_user, public.flags to authenticated;
grant select on public.profiles, public.article_refs, public.discussions, public.posts, public.tags,
  public.discussion_tag, public.post_likes, public.discussion_user, public.flags to service_role;
revoke update(display_name) on public.profiles from authenticated;
drop policy profiles_edit on public.profiles;

alter table public.discussions enable row level security;
alter table public.posts enable row level security;
alter table public.tags enable row level security;
alter table public.discussion_tag enable row level security;
alter table public.post_likes enable row level security;
alter table public.discussion_user enable row level security;
alter table public.flags enable row level security;
create policy article_refs_read on public.article_refs for select to anon, authenticated using (is_published or private.is_staff());
create policy discussions_read on public.discussions for select to anon, authenticated using (private.can_read_discussion(id) or private.is_staff());
create policy posts_read on public.posts for select to anon, authenticated using (private.can_read_post(id) or private.is_staff());
create policy tags_read on public.tags for select to anon, authenticated using (true);
create policy discussion_tag_read on public.discussion_tag for select to anon, authenticated using (private.can_read_discussion(discussion_id) or private.is_staff());
create policy post_likes_read on public.post_likes for select to anon, authenticated using (private.can_read_post(post_id) or private.is_staff());
create policy discussion_user_read on public.discussion_user for select to authenticated using (user_id = (select auth.uid()) and private.can_read_discussion(discussion_id));
create policy flags_read on public.flags for select to authenticated using (reporter_id = (select auth.uid()) or private.is_staff());

-- Enumerate only this migration's functions; do not change unrelated RPC ACLs.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature, n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'private' and p.proname = any(array['is_staff','can_read_discussion','can_read_post','require_member','take_cooldown','lock_discussion','refresh_discussion','set_tags','add_post','validate_article_manifest']))
       or (n.nspname = 'public' and p.proname = any(array['create_profile','create_discussion','reply_to_discussion','edit_discussion','edit_post','delete_discussion','delete_post','get_my_access','update_profile','set_post_like','mark_discussion_read','flag_post','moderate_discussion','moderate_post','resolve_flag','set_user_access','save_tag','prepare_articles','activate_articles']))
  loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f.signature);
    if f.nspname = 'private' and f.proname in ('is_staff','can_read_discussion','can_read_post') then
      execute format('grant execute on function %s to anon, authenticated', f.signature);
    elsif f.nspname = 'public' and f.proname in ('prepare_articles','activate_articles') then
      execute format('grant execute on function %s to service_role', f.signature);
    elsif f.nspname = 'public' and f.proname <> 'create_profile' then
      execute format('grant execute on function %s to authenticated', f.signature);
    end if;
  end loop;
end;
$$;

insert into public.tags(slug, name, position) values ('general', 'General', 0), ('questions', 'Questions', 1), ('projects', 'Projects', 2);
commit;
