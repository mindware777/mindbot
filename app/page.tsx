import Link from "next/link";
import { publishedArticles } from "@/lib/articles";
import HomeFeed from "./home-feed";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="mindbot home">
          <span className="brand-symbol" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none"><path d="M16 7V3m-2 0h4M7 14H4v7h3m18-7h3v7h-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><rect x="7" y="8" width="18" height="18" rx="6" stroke="currentColor" strokeWidth="1.7"/><circle cx="12.5" cy="16" r="1.5" fill="currentColor"/><circle cx="19.5" cy="16" r="1.5" fill="currentColor"/><path d="M13 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
          </span>
          <span>mindbot<span className="brand-period">.</span></span>
        </Link>
        <span className="header-note">Between robots and people</span>
      </header>
      <main>
        <section className="introduction" aria-labelledby="home-title">
          <p className="eyebrow"><span />Small curiosities, new possibilities</p>
          <h1 id="home-title">Read robotics.<br className="mobile-break" /> Think together.</h1>
          <p className="introduction-note">Stories about changing technology and the joy of building.</p>
        </section>
        <HomeFeed articles={publishedArticles().map(({ id, slug, title, summary, category, publishedAt, draft }) => ({ id, slug, title, summary, category, publishedAt, draft }))} />
      </main>
      <footer className="site-footer"><span>mindbot</span><span>A small space for shared curiosity.</span></footer>
    </div>
  );
}
