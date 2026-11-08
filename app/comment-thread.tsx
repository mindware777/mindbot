"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
type Comment = {id: string; author_id: string; body: string; created_at: string; profiles: {display_name: string} | null};
export default function CommentThread({articleId}: {articleId: string}) {
  const [rows,setRows] = useState<Comment[]>([]), [user,setUser] = useState<string>(), [body,setBody] = useState(""), [error,setError] = useState(""), [busy,setBusy] = useState(false), [loading,setLoading] = useState(false), [more,setMore] = useState(false);
  async function load(offset = 0) {
    setLoading(true);
    try {
      const client = getSupabase();
      const {data,error} = await client.from("comments").select("id,author_id,body,created_at,profiles(display_name)").eq("article_id",articleId).eq("hidden",false).order("created_at").order("id").range(offset,offset+19);
      if(error) throw error;
      const next = data as unknown as Comment[];
      setRows(previous => offset ? [...previous,...next] : next); setMore(next.length === 20);
    } catch(error) { setError(error instanceof Error ? error.message : "Comments are unavailable. Please try again."); } finally {setLoading(false);}
  }
  useEffect(() => {
    let active = true;
    try {
      const client = getSupabase();
      void client.auth.getSession().then(({data}) => {if(active) setUser(data.session?.user.id);});
      const {data} = client.auth.onAuthStateChange((_event,session) => {if(active) setUser(session?.user.id);});
      void Promise.resolve().then(() => {if(active) return load();});
      return () => {active=false; data.subscription.unsubscribe();};
    } catch(error) { queueMicrotask(() => {if(active) setError(error instanceof Error ? error.message : "Comments unavailable.");}); }
    // The thread is mounted for a single immutable article ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[articleId]);
  async function change(action: () => PromiseLike<{error: unknown}>) {
    setBusy(true); setError("");
    try {const {error} = await action(); if(error) throw error; setBody(""); await load();}
    catch(error) {setError(error instanceof Error ? error.message : "Unable to save. Please retry.");}
    finally {setBusy(false);}
  }
  return <div><h2>Comments</h2>{error && <p role="alert">{error}</p>}
    <button disabled={busy || loading} onClick={() => {setError(""); void load();}}>Refresh</button>
    {rows.map(row => <article className="article" key={row.id}><strong>{row.profiles?.display_name || "Member"}</strong><p style={{whiteSpace:"pre-wrap"}}>{row.body}</p>{row.author_id===user && <div><button disabled={busy} onClick={() => {const updated=prompt("Edit comment",row.body); if(updated?.trim()) void change(() => getSupabase().from("comments").update({body:updated.trim()}).eq("id",row.id));}}>Edit</button> <button disabled={busy} onClick={() => {if(confirm("Delete this comment?")) void change(() => getSupabase().from("comments").delete().eq("id",row.id));}}>Delete</button></div>}</article>)}
    {more && <button disabled={loading} onClick={() => void load(rows.length)}>Load more</button>}
    {user ? <form onSubmit={event => {event.preventDefault(); if(body.trim()) void change(() => getSupabase().from("comments").insert({article_id:articleId,author_id:user,body:body.trim()}));}}><label htmlFor="comment-body">Your comment</label><textarea id="comment-body" required maxLength={5000} value={body} onChange={event=>setBody(event.target.value)}/><button disabled={busy || !body.trim()}>Post comment</button></form> : <p className="signin-note">Sign in from the header to join the discussion.</p>}
  </div>;
}
