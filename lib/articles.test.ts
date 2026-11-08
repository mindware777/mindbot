import { test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readArticles, publishedArticles } from './articles';
const fixture = (extra='') => `---\nid: "640ec198-8210-4bad-825b-dc73e21c51c1"\nslug: test-story\ntitle: Test\nsummary: Summary\ncategory: Robotics\npublishedAt: "2026-11-07T00:00:00Z"\ndraft: false\n${extra}---\n![v](https://example.invalid/v.jpg)\nBody`;
function directoryTest(run: (dir:string)=>void) { const dir=mkdtempSync(join(tmpdir(),'mindbot-')); try {run(dir);} finally {rmSync(dir,{recursive:true,force:true});} }
test('drafts are excluded from published articles',()=> {expect(publishedArticles().every(a=>!a.draft)).toBe(true); expect(publishedArticles().some(a=>a.slug==='draft-example')).toBe(false);});
test('reject duplicate public identifiers',()=>directoryTest(dir=> {writeFileSync(join(dir,'one.md'),fixture());writeFileSync(join(dir,'two.md'),fixture());expect(()=>readArticles(dir)).toThrow('duplicate');}));
test('reject invalid slugs, timestamps, categories, and missing draft flag',()=>directoryTest(dir=> {for(const [from,to] of [['test-story','../escape'],['2026-11-07T00:00:00Z','yesterday'],['Robotics','Unknown'],['draft: false','draft: "false"']]) {writeFileSync(join(dir,'one.md'),fixture().replace(from,to));expect(()=>readArticles(dir)).toThrow();}}));
test('preview registration never requires credentials or writes remotely',async()=> {const proc=Bun.spawn(['bun','scripts/register-articles.ts'],{env:{...process.env,CF_PAGES:'1',CF_PAGES_BRANCH:'preview',PRODUCTION_BRANCH:'main',SUPABASE_PUBLISHING_KEY:''},stdout:'pipe',stderr:'pipe'});expect(await proc.exited).toBe(0);expect(await new Response(proc.stdout).text()).toContain('skipped');});
test('production registration fails closed without credentials',async()=> {const proc=Bun.spawn(['bun','scripts/register-articles.ts'],{env:{...process.env,CF_PAGES:'1',CF_PAGES_BRANCH:'main',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_PUBLISHING_KEY:''},stdout:'pipe',stderr:'pipe'});expect(await proc.exited).not.toBe(0);});
