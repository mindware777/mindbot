import Link from "next/link";
import { publishedArticles } from "@/lib/articles";

export default function Home() {
  const latest = publishedArticles().slice(0, 3);
  return <main>
    <section className="introduction" aria-labelledby="home-title">
      <p className="eyebrow"><span />Small curiosities, new possibilities</p>
      <h1 id="home-title">Read robotics.<br className="mobile-break" /> Think together.</h1>
      <p className="introduction-note">Stories about changing technology and the joy of building.</p>
    </section>
    <section className="feed" aria-label="Latest news">
      <div className="section-header">
        <h2>Latest</h2>
        <Link className="section-more" href="/news/">All news →</Link>
      </div>
      <div className="article-list">
        {latest.map(article => <article className="article" key={article.id}><p className="article-category tone-green">{article.category}</p><h2><Link href={`/news/${article.slug}/`}>{article.title}</Link></h2><p className="article-summary">{article.summary}</p></article>)}
        {!latest.length && <p>No stories yet.</p>}
      </div>
    </section>
    <nav className="landing-links" aria-label="Sections">
      <Link href="/news/">News</Link>
      {/* Hidden until the forum ships; /community/ stays reachable by direct URL. */}
      {/* <Link href="/community/">Community</Link> */}
      <Link href="/jobs/">Jobs</Link>
    </nav>
  </main>;
}
