"use client";
import Link from "next/link";
import { useState } from "react";
import { categories, type ArticleMetadata } from "@/lib/article-types";
export default function HomeFeed({ articles }: { articles: ArticleMetadata[] }) {
  const [selected, setSelected] = useState("All");
  const visible = articles.filter(article => selected === "All" || article.category === selected);
  return <section className="feed" aria-label="News"><div className="feed-toolbar"><div className="categories" role="group" aria-label="Article categories">
    {["All", ...categories].map(category => <button key={category} className="category-button" aria-pressed={selected === category} aria-controls="article-list" onClick={() => setSelected(category)}>{category}</button>)}
  </div></div><div id="article-list" className="article-list" aria-live="polite">
    {visible.map(article => <article className="article" key={article.id}><p className="article-category tone-green">{article.category}</p><h2><Link href={`/news/${article.slug}/`}>{article.title}</Link></h2><p className="article-summary">{article.summary}</p></article>)}
    {!visible.length && <p>No stories in this category yet.</p>}
  </div></section>;
}
