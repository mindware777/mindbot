"""Exercise migrations and forum RPCs in disposable, socket-only PostgreSQL databases.

No Supabase project credentials, linked project, or existing database are used.
"""
from concurrent.futures import ThreadPoolExecutor
import json
import os
import runpy
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS = sorted((ROOT / "supabase/migrations").glob("*.sql"))
A = "10000000-0000-4000-8000-000000000001"
B = "10000000-0000-4000-8000-000000000002"
MOD = "10000000-0000-4000-8000-000000000003"
ADMIN = "10000000-0000-4000-8000-000000000004"
ARTICLE = "640ec198-8210-4bad-825b-dc73e21c51c1"
LEGACY = "20000000-0000-4000-8000-000000000001"
HIDDEN = "20000000-0000-4000-8000-000000000002"
BOOTSTRAP = """
create schema auth;
create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
-- Model permissive platform defaults so the migration must remove these grants.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
"""


def run(*args, **kwargs):
    return subprocess.run(args, text=True, capture_output=True, check=True, **kwargs)


with tempfile.TemporaryDirectory(prefix="mindbot-forum-pg-") as directory:
    base = Path(directory)
    data = base / "data"
    # A unique socket directory isolates the fixed port from other local clusters.
    pg_env = {**os.environ, "PGHOST": str(base), "PGPORT": "55439", "PGDATABASE": "postgres", "PGUSER": os.environ.get("USER", "postgres")}
    run("initdb", "-D", str(data), "-A", "trust", "--no-locale", "-E", "UTF8")
    run("pg_ctl", "-D", str(data), "-l", str(base / "log"), "-o", f"-k {base} -p 55439 -c listen_addresses=''", "-w", "start")
    try:
        def sql(query, db="postgres", role=None, uid=None, error=None):
            prefix = ""
            if role:
                prefix = f"set role {role}; set request.jwt.claim.sub='{uid or ''}'; "
            result = subprocess.run(["psql", "-X", "-q", "-tA", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"],
                                    input=prefix + query, text=True, capture_output=True, env={**pg_env, "PGDATABASE": db})
            if error:
                assert result.returncode != 0 and error in result.stderr, (query, result.stdout, result.stderr)
                return result.stderr
            assert result.returncode == 0, (query[:200], result.stderr)
            return result.stdout.strip()

        sql("create role anon; create role authenticated; create role service_role bypassrls;")
        for populated in (False, True):
            db = "forum_upgrade" if populated else "forum_empty"
            sql(f"create database {db};")
            sql(BOOTSTRAP, db)
            sql(MIGRATIONS[0].read_text(), db)
            if populated:
                sql(f"insert into auth.users(id) values ('{A}'), ('{B}'); insert into public.article_refs(id) values ('{ARTICLE}');", db)
                sql(f"""insert into public.comments(id, article_id, author_id, body, created_at, updated_at, hidden)
                    values ('{LEGACY}', '{ARTICLE}', '{A}', 'Preserved body', '2026-01-01Z', '2026-01-02Z', false);
                    delete from public.comment_rate_limits;
                    insert into public.comments(id, article_id, author_id, body, created_at, updated_at, hidden)
                    values ('{HIDDEN}', '{ARTICLE}', '{A}', 'Hidden body', '2026-01-01Z', '2026-01-03Z', true);""", db)
                legacy_before = sql(f"select body || ':' || author_id || ':' || created_at || ':' || updated_at from public.comments where id='{LEGACY}';", db)
                cooldown_before = sql(f"select last_post_at from public.comment_rate_limits where user_id='{A}';", db)
            for migration in MIGRATIONS[1:]:
                sql(migration.read_text(), db)
            assert sql("select count(*) from pg_tables where schemaname in ('public','private');", db) == "11"
            assert sql("select count(*) from pg_tables where schemaname in ('public','private') and not rowsecurity;", db) == "0"
            if populated:
                assert sql(f"select body || ':' || author_id || ':' || created_at || ':' || updated_at from public.posts where id='{LEGACY}';", db) == legacy_before
                assert sql(f"select number from public.posts where id='{LEGACY}';", db) == "1"
                assert sql(f"select last_post_at from private.write_rate_limits where user_id='{A}';", db) == cooldown_before
                assert sql(f"select number || ':' || (hidden_at is not null)::text from public.posts where id='{HIDDEN}';", db) == "2:true"
                assert sql("select next_post_number || ':' || post_count from public.discussions;", db) == "3:1"
                assert sql(f"select count(*) from private.write_rate_limits where user_id='{A}';", db) == "1"
                assert sql("select count(*) from public.posts;", db, role="anon") == "0"
            print(f"Passed {'populated upgrade' if populated else 'empty installation'} migration.")

        db = "forum_upgrade"
        def user(query, uid=A, error=None):
            return sql(query, db, role="authenticated", uid=uid, error=error)

        def owner(query):
            return sql(query, db)

        def anon(query, error=None):
            return sql(query, db, role="anon", error=error)

        def service(query, error=None):
            return sql(query, db, role="service_role", error=error)

        def cooldown(uid=A):
            owner(f"delete from private.write_rate_limits where user_id='{uid}';")

        owner(f"insert into auth.users(id,raw_user_meta_data) values ('{MOD}', '{{\"role\":\"admin\",\"full_name\":\"Moderator\"}}'), ('{ADMIN}','{{}}');")
        assert owner(f"select role from private.user_access where user_id='{MOD}';") == "member"
        owner(f"update private.user_access set role='moderator' where user_id='{MOD}'; update private.user_access set role='admin' where user_id='{ADMIN}';")
        assert json.loads(user("select public.get_my_access();")) == {"role": "member", "suspended_until": None}
        assert json.loads(user("select public.get_my_access();", MOD))["role"] == "moderator"
        user("select public.update_profile('Updated member');")
        assert anon(f"select display_name from public.profiles where id='{A}';") == "Updated member"
        user("select public.update_profile('');", error="22023")
        user("select * from private.user_access;", error="42501")
        user("select private.take_cooldown(auth.uid());", error="42501")
        anon("select public.create_discussion('Forged', 'Body');", error="42501")
        user("insert into public.discussions(kind,title) values ('community','Forged');", error="42501")
        user(f"update public.profiles set display_name='Forged' where id='{B}';", error="42501")
        user(f"select public.set_user_access('{B}','admin');", error="42501")
        user(f"select public.set_user_access('{B}','member');", MOD, error="42501")
        user(f"select public.set_user_access('{ADMIN}','member');", ADMIN, error="42501")
        service("insert into public.article_refs(id) values (gen_random_uuid());", error="42501")
        assert owner("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon',p.oid,'execute');") == "0"
        assert owner("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and has_function_privilege('authenticated',p.oid,'execute') and p.proname not in ('is_staff','can_read_discussion','can_read_post');") == "0"
        assert owner("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef and p.proconfig is null;") == "0"
        print("Passed grants, private helpers, identity, profile, and role protections.")

        manifest = json.dumps([{"id": ARTICLE, "slug": "test-article", "title": "Test article", "published_at": "2026-01-01T00:00:00Z"}])
        user(f"select public.prepare_articles('{manifest}');", error="42501")
        service(f"select public.prepare_articles('{manifest}');")
        service(f"select public.prepare_articles('{manifest}');")
        assert owner("select count(*) from public.discussions where kind='article';") == "1"
        assert anon("select count(*) from public.article_refs;") == "0"
        service(f"select public.activate_articles('{manifest}');")
        service(f"select public.activate_articles('{manifest}');")
        assert anon("select count(*) from public.posts;") == "1"
        article_topic = owner(f"select id from public.discussions where article_id='{ARTICLE}';")
        user(f"select public.reply_to_discussion('{article_topic}','Preserved cooldown');", error="P0001")
        bad = json.dumps([{"id": ARTICLE, "slug": "changed-slug", "title": "Changed", "published_at": "2026-01-01Z"}])
        service(f"select public.prepare_articles('{bad}');", error="22023")
        service(f"select public.prepare_articles('{json.dumps(json.loads(manifest) * 2)}');", error="22023")
        service("select public.prepare_articles(null);", error="22023")
        service("select public.activate_articles('[]');")
        assert anon("select count(*) from public.posts;") == "0"
        assert owner("select count(*) from public.posts;") == "2"
        service(f"select public.activate_articles('{manifest}');")
        print("Passed publication preparation, activation, retries, retirement, and legacy cooldown preservation.")

        # Preparation of a new article is invisible until activation, including on failed deploy.
        second_article = '640ec198-8210-4bad-825b-dc73e21c51c2'
        second_manifest = json.dumps(json.loads(manifest) + [{"id": second_article, "slug": "next-article", "title": "Next article", "published_at": "2026-01-02Z"}])
        service(f"select public.prepare_articles('{second_manifest}');")
        assert anon("select count(*) from public.article_refs;") == "1"
        assert anon("select count(*) from public.discussions where kind='article';") == "1"
        assert anon(f"select title from public.article_refs where id='{ARTICLE}';") == "Test article"
        service(f"select public.activate_articles('{second_manifest}');")
        assert anon("select count(*) from public.article_refs;") == "2"
        service(f"select public.activate_articles('{manifest}');")
        assert anon("select count(*) from public.article_refs;") == "1"
        cooldown()
        topics_before = owner("select count(*) from public.discussions;")
        user("select public.create_discussion('Rollback', '');", error="22023")
        assert owner("select count(*) from public.discussions;") == topics_before
        user("select public.create_discussion('Invalid tag', 'Body', array['99999999-0000-4000-8000-000000000000'::uuid]);", error="23503")
        assert owner("select count(*) from public.discussions;") == topics_before
        assert owner(f"select count(*) from private.write_rate_limits where user_id='{A}';") == "0"
        tag = anon("select id from public.tags where slug='questions';")
        topic = user(f"select id from public.create_discussion('Question', 'Original body', array['{tag}'::uuid]);")
        root_post = owner(f"select id from public.posts where discussion_id='{topic}' and number=1;")
        assert anon(f"select post_count || ':' || next_post_number from public.discussions where id='{topic}';") == "1:2"
        user("select public.create_discussion('Too soon', 'Body');", error="P0001")
        user(f"select public.reply_to_discussion('{article_topic}','Shared cooldown');", error="P0001")
        user(f"select public.edit_post('{root_post}','Someone else');", B, error="42501")
        user(f"select public.edit_discussion('{topic}','Someone else');", B, error="42501")
        user(f"select public.edit_post('{root_post}','Edited original');")
        user(f"select public.edit_discussion('{topic}','Edited title',array['{tag}'::uuid]);")
        cooldown(B)
        user(f"select public.reply_to_discussion('{topic}','Invalid target','{LEGACY}');", B, error="22023")
        reply = user(f"select id from public.reply_to_discussion('{topic}','Reply','{root_post}');", B)
        user(f"select public.delete_discussion('{topic}');", error="42501")
        user(f"select public.delete_post('{root_post}');", error="42501")
        user(f"select public.delete_post('{reply}');", error="42501")
        user(f"select public.set_post_like('{reply}',true);")
        user(f"select public.set_post_like('{reply}',true);")
        assert anon(f"select count(*) from public.post_likes where post_id='{reply}';") == "1"
        user(f"select public.set_post_like('{reply}',false);")
        user(f"select public.set_post_like('{reply}',true);")
        user(f"select public.mark_discussion_read('{topic}',2);")
        user(f"select public.mark_discussion_read('{topic}',1);")
        assert user(f"select last_read_post_number from public.discussion_user where discussion_id='{topic}';") == "2"
        assert user("select count(*) from public.discussion_user;", B) == "0"
        user(f"select public.mark_discussion_read('{topic}',999);", error="22023")
        flag = user(f"select public.flag_post('{reply}','spam','Details');")
        assert user(f"select public.flag_post('{reply}','spam');") == flag
        assert user("select count(*) from public.flags;", B) == "0"
        anon("select * from public.flags;", error="42501")
        assert user("select count(*) from public.flags;", MOD) == "1"
        user(f"select public.resolve_flag('{flag}','resolved');", error="42501")
        user(f"select public.resolve_flag('{flag}','resolved');", MOD)
        print("Passed topic transactions, ownership, reply targets, tags, likes, read state, and reporting.")

        user(f"select public.moderate_post('{reply}','hide');", error="42501")
        user(f"select public.moderate_post('{reply}','hide');", MOD)
        assert anon(f"select count(*) from public.posts where id='{reply}';") == "0"
        assert anon(f"select count(*) from public.post_likes where post_id='{reply}';") == "0"
        assert anon(f"select post_count || ':' || last_post_id from public.discussions where id='{topic}';") == f"1:{root_post}"
        user(f"select public.edit_post('{reply}','Hidden edit');", B, error="42501")
        user(f"select public.moderate_post('{reply}','restore');", MOD)
        assert anon(f"select post_count from public.discussions where id='{topic}';") == "2"
        user(f"select public.moderate_post('{root_post}','hide');", MOD)
        assert anon(f"select count(*) from public.discussions where id='{topic}';") == "0"
        assert anon(f"select count(*) from public.posts where discussion_id='{topic}';") == "0"
        assert anon(f"select count(*) from public.discussion_tag where discussion_id='{topic}';") == "0"
        user(f"select public.moderate_discussion('{topic}','restore');", MOD)
        assert anon(f"select count(*) from public.posts where discussion_id='{topic}';") == "2"
        user(f"select public.moderate_discussion('{topic}','pin');", MOD)
        user(f"select public.moderate_discussion('{topic}','lock');", MOD)
        cooldown(B)
        user(f"select public.reply_to_discussion('{topic}','Locked');", B, error="42501")
        user(f"select public.edit_post('{root_post}','Locked');", error="42501")
        user(f"select public.set_post_like('{root_post}',true);")
        user(f"select public.mark_discussion_read('{topic}',2);")
        user(f"select public.moderate_discussion('{topic}','unlock');", MOD)
        user(f"select public.set_user_access('{B}','member',now()+interval '1 day');", ADMIN)
        user(f"select public.reply_to_discussion('{topic}','Suspended');", B, error="42501")
        user(f"select public.set_post_like('{root_post}',true);", B, error="42501")
        user(f"select public.set_user_access('{B}','member');", ADMIN)
        user(f"select public.delete_post('{reply}');", B)
        assert anon(f"select post_count from public.discussions where id='{topic}';") == "1"
        cooldown(B)
        assert user(f"select number from public.reply_to_discussion('{topic}','Next reply');", B) == "3"
        user(f"select public.reply_to_discussion('{topic}','Too soon');", B, error="P0001")
        owner(f"delete from auth.users where id='{B}';")
        assert owner(f"select count(*) from public.posts where discussion_id='{topic}' and author_id is null;") == "2"
        user(f"select public.delete_discussion('{topic}');", error="42501")
        print("Passed moderation visibility/aggregates, lock/suspension, sequence preservation, and account anonymization.")

        cooldown()
        disposable = user("select id from public.create_discussion('Disposable','Body');")
        user(f"select public.delete_discussion('{disposable}');")
        assert anon(f"select count(*) from public.discussions where id='{disposable}';") == "0"
        user("select public.create_discussion('Bypass','Body');", error="P0001")
        cooldown()
        def concurrent_post(_):
            try:
                return user(f"select number from public.reply_to_discussion('{topic}','Concurrent');")
            except AssertionError as exc:
                assert 'P0001' in str(exc), exc
                return 'cooldown'
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(concurrent_post, range(2)))
        assert sorted(results) == ['4', 'cooldown'], results
        # Distinct active users must serialize numbering without losing either post.
        cooldown(MOD)
        cooldown(ADMIN)
        def distinct_post(uid):
            return user(f"select number from public.reply_to_discussion('{topic}','Different actor');", uid)
        with ThreadPoolExecutor(max_workers=2) as pool:
            numbers = list(pool.map(distinct_post, (MOD, ADMIN)))
        assert sorted(numbers) == ['5', '6'], numbers
        assert owner(f"select post_count || ':' || next_post_number from public.discussions where id='{topic}';") == "5:7"
        print("Passed soft deletion, cooldown persistence, same-user and distinct-user concurrent writes.")
        generator = runpy.run_path(str(ROOT / "scripts/forum-types.py"))
        contract = generator['render'](json.loads(owner(generator['CATALOG_SQL'])))
        type_path = ROOT / "lib/forum-database.types.ts"
        if os.environ.get("UPDATE_FORUM_TYPES") == "1":
            type_path.write_text(contract)
            print("Regenerated the public forum TypeScript contract from local catalogs.")
        else:
            assert type_path.read_text() == contract, "Forum types drifted; run bun run test:db:update-types."
        print("All forum database checks passed. No remote database was contacted.")
    finally:
        run("pg_ctl", "-D", str(data), "-m", "immediate", "-w", "stop")
