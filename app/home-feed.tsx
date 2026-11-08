"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { categories, type ArticleMetadata } from "@/lib/article-types";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("mindbot-category-change", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("mindbot-category-change", callback);
  };
}
function readCategory() {
  const fromUrl = new URLSearchParams(location.search).get("category");
  return fromUrl && (categories as readonly string[]).includes(fromUrl) ? fromUrl : "All";
}
export default function HomeFeed({ articles, syncUrl = false }: { articles: ArticleMetadata[]; syncUrl?: boolean }) {
  const [local, setLocal] = useState("All");
  const fromUrl = useSyncExternalStore(subscribe, readCategory, () => "All");
  const selected = syncUrl ? fromUrl : local;
  function select(category: string) {
    if (!syncUrl) {
      setLocal(category);
      return;
    }
    const url = new URL(location.href);
    if (category === "All") url.searchParams.delete("category");
    else url.searchParams.set("category", category);
    history.replaceState(null, "", url);
    window.dispatchEvent(new Event("mindbot-category-change"));
  }
  const visible = articles.filter(article => selected === "All" || article.category === selected);
  return <section className="feed" aria-label="News"><div className="feed-toolbar"><div className="categories" role="group" aria-label="Article categories">
    {["All", ...categories].map(category => <button key={category} className="category-button" aria-pressed={selected === category} aria-controls="article-list" onClick={() => select(category)}>{category}</button>)}
  </div></div><div id="article-list" className="article-list" aria-live="polite">
    {visible.map(article => <article className="article" key={article.id}><p className="article-category tone-green">{article.category}</p><h2><Link href={`/news/${article.slug}/`}>{article.title}</Link></h2><p className="article-summary">{article.summary}</p></article>)}
    {!visible.length && <p>No stories in this category yet.</p>}
  </div></section>;
}
