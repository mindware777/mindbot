import { createClient } from '@supabase/supabase-js';
import { publishedArticles } from '../lib/articles';
const productionBranch = process.env.PRODUCTION_BRANCH || 'main';
if (process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH === productionBranch) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_PUBLISHING_KEY;
  if (!url || !key || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) throw new Error('Production publishing credentials are missing. Deployment stopped.');
  const ids = publishedArticles().map(({id}) => ({id}));
  const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  for(let offset=0;offset<ids.length;offset+=500) {
    const {error} = await client.from('article_refs').upsert(ids.slice(offset,offset+500), {onConflict:'id',ignoreDuplicates:true});
    if(error) throw new Error(`Article registration failed: ${error.message}`);
  }
  console.log(`Registered ${ids.length} public article references.`);
} else console.log('Article registration skipped outside the production Pages build.');
