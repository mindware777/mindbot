import { expect, test } from 'bun:test';

const baseEnv = {
  ...process.env, CI: '', WORKERS_CI: '', CF_PAGES: '',
  SUPABASE_LOCAL_SECRET_KEY: '',
};
async function run(url: string, args: string[] = [], key = '') {
  const process = Bun.spawn(['bun', 'scripts/register-local-articles.ts', ...args], {
    env: { ...baseEnv, SUPABASE_LOCAL_URL: url, SUPABASE_LOCAL_SECRET_KEY: key },
    stdout: 'pipe', stderr: 'pipe',
  });
  const [code, stdout, stderr] = await Promise.all([
    process.exited, new Response(process.stdout).text(), new Response(process.stderr).text(),
  ]);
  return { code, stdout, stderr };
}

test('local article registration refuses remote targets before reading credentials', async () => {
  const result = await run('https://example.invalid', ['--dry-run']);
  expect(result.code).not.toBe(0);
  expect(result.stderr).toContain('Remote projects are refused');
});

test('dry run emits only published navigation metadata and requires no credentials', async () => {
  const result = await run('http://127.0.0.1:54321', ['--dry-run']);
  expect(result.code).toBe(0);
  const manifest = JSON.parse(result.stdout) as Record<string, unknown>[];
  expect(manifest.length).toBeGreaterThan(0);
  expect(manifest.some(row => row.slug === 'draft-example')).toBe(false);
  for (const row of manifest) expect(Object.keys(row).sort()).toEqual(['id', 'published_at', 'slug', 'title']);
});

test('local publication prepares then activates', async () => {
  const requests: { path: string; body: unknown }[] = [];
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
    requests.push({ path: new URL(request.url).pathname, body: await request.json() });
    return new Response(null, { status: 204 });
  } });
  try {
    const result = await run(server.url.origin, [], 'sb_secret_local_test');
    expect(result.code).toBe(0);
    expect(requests.map(request => request.path)).toEqual([
      '/rest/v1/rpc/prepare_articles', '/rest/v1/rpc/activate_articles',
    ]);
    expect(requests[0].body).toEqual(requests[1].body);
  } finally { server.stop(true); }
});

test('failed preparation does not activate a manifest', async () => {
  const paths: string[] = [];
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch(request) {
    paths.push(new URL(request.url).pathname);
    return Response.json({ message: 'Preparation rejected', code: '22023' }, { status: 400 });
  } });
  try {
    const result = await run(server.url.origin, [], 'sb_secret_local_test');
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('Preparation rejected');
    expect(paths).toEqual(['/rest/v1/rpc/prepare_articles']);
  } finally { server.stop(true); }
});


test('local registration never follows redirects with its publishing credential', async () => {
  const paths: string[] = [];
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch(request) {
    const path = new URL(request.url).pathname;
    paths.push(path);
    return new Response(null, { status: 302, headers: { Location: '/unexpected-target' } });
  } });
  try {
    const result = await run(server.url.origin, [], 'sb_secret_local_test');
    expect(result.code).not.toBe(0);
    expect(paths).toEqual(['/rest/v1/rpc/prepare_articles']);
  } finally { server.stop(true); }
});
