"""Run permission tests against a disposable local PostgreSQL cluster."""
import pathlib
from concurrent.futures import ThreadPoolExecutor
import subprocess
import tempfile

root = pathlib.Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix="mindbot-pg-") as directory:
    base = pathlib.Path(directory)
    data = base / "data"
    def command(*args):
        return subprocess.run(args, text=True, capture_output=True, check=True)
    command("initdb", "-D", str(data), "-A", "trust", "--no-locale")
    command("pg_ctl", "-D", str(data), "-l", str(base / "log"), "-o", f"-k {base} -p 55439 -c listen_addresses=''", "-w", "start")
    try:
        def sql(query, denied=False):
            result = subprocess.run(["psql", "-h", str(base), "-p", "55439", "-d", "postgres", "-X", "-tA", "-v", "ON_ERROR_STOP=1"], input=query, text=True, capture_output=True)
            if denied:
                assert result.returncode != 0, f"Expected denial: {query}"
            else:
                assert result.returncode == 0, result.stderr
            return result.stdout.strip().splitlines()[-1] if result.stdout.strip() else ""
        sql("""create role anon; create role authenticated; create role service_role bypassrls;
        create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        grant usage on schema auth to anon, authenticated;
        grant execute on function auth.uid() to anon, authenticated;""")
        sql((root / "supabase/migrations/202611070001_initial.sql").read_text())
        first = "10000000-0000-4000-8000-000000000001"
        other = "10000000-0000-4000-8000-000000000002"
        article = "640ec198-8210-4bad-825b-dc73e21c51c1"
        comment = "20000000-0000-4000-8000-000000000001"
        sql(f"insert into auth.users(id) values ('{first}'),('{other}'); insert into public.article_refs(id) values ('{article}');")
        def user(query, uid=first, denied=False):
            return sql(f"set role authenticated; set request.jwt.claim.sub='{uid}'; {query}",denied)
        sql(f"set role anon; insert into public.comments(article_id,author_id,body) values ('{article}','{first}','Anonymous');",True)
        user(f"insert into public.comments(article_id,author_id,body) values ('{article}','{other}','Forged');",denied=True)
        user(f"insert into public.comments(article_id,author_id,body) values ('{article}','{first}','Hello');")
        assert sql("set role anon; select count(*) from public.comments;") == "1"
        user(f"insert into public.comments(article_id,author_id,body) values ('{article}','{first}','Too soon');",denied=True)
        assert user("update public.comments set body='Unauthorized' returning id;",uid=other) == "UPDATE 0"
        user("update public.comments set hidden=true;",denied=True)
        user(f"insert into public.article_refs(id) values ('{comment}');",denied=True)
        user("update public.comments set body='Edited';")
        sql("update public.comments set hidden=true;")
        assert sql("set role anon; select count(*) from public.comments;") == "0"
        user("delete from public.comments;")
        user(f"insert into public.comments(article_id,author_id,body) values ('{article}','{first}','Cooldown after delete');",denied=True)
        user(f"insert into public.comments(article_id,author_id,body) values ('{comment}','{other}','Unknown article');",uid=other,denied=True)
        user(f"update public.profiles set id='{comment}';",denied=True)
        sql("delete from public.comment_rate_limits;")
        def concurrent_post(_):
            result = subprocess.run(["psql", "-h", str(base), "-p", "55439", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1"], input=f"set role authenticated; set request.jwt.claim.sub='{first}'; insert into public.comments(article_id,author_id,body) values ('{article}','{first}','Concurrent');",text=True,capture_output=True)
            return result.returncode, result.stderr
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(concurrent_post, range(2)))
            assert sum(code == 0 for code, _ in results) == 1, results
            assert any(code != 0 and "wait 30 seconds" in error for code, error in results), results
        print("Database checks passed: migration, public reads, ownership, moderation, article registration, foreign keys, and posting cooldown.")
    finally:
        command("pg_ctl", "-D", str(data), "-m", "immediate", "-w", "stop")
