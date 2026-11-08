import { createClient } from '@supabase/supabase-js';
import { publishedArticles } from '../lib/articles';
import type { Database } from '../lib/forum-database.types';

// Dedicated local credentials keep the linked project and production env out of this command.
const url = new URL(process.env.SUPABASE_LOCAL_URL || 'http://127.0.0.1:54321');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    !['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash) {
  throw new Error('Article registration requires a loopback Supabase URL. Remote projects are refused.');
}
if (process.env.CI || process.env.WORKERS_CI || process.env.CF_PAGES) {
  throw new Error('Local article registration cannot run in CI.');
}
const manifest = publishedArticles().map(({ id, slug, title, publishedAt }) => ({
  id, slug, title, published_at: publishedAt,
}));
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  const key = process.env.SUPABASE_LOCAL_SECRET_KEY;
  if (!key) throw new Error('Set SUPABASE_LOCAL_SECRET_KEY from your local Supabase instance.');
  const localFetch: typeof fetch = Object.assign(
    (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      fetch(input, { ...init, redirect: 'error' }),
    { preconnect: fetch.preconnect },
  );
  const client = createClient<Database>(url.origin, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: localFetch },
  });
  for (const rpc of ['prepare_articles', 'activate_articles'] as const) {
    const { error } = await client.rpc(rpc, { p_articles: manifest });
    if (error) throw new Error(`Local ${rpc} failed: ${error.message}`);
  }
  console.log(`Registered and activated ${manifest.length} local article discussions.`);
}
