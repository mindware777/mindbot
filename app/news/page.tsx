import { publishedArticles } from "@/lib/articles";
import HomeFeed from "../home-feed";

export default function NewsIndex() {
  const articles = publishedArticles().map(({ id, slug, title, summary, category, publishedAt, draft }) => ({ id, slug, title, summary, category, publishedAt, draft }));
  return <main>
    <section className="introduction page-introduction" aria-labelledby="news-title">
      <p className="eyebrow"><span />News</p>
      <h1 id="news-title">Robotics, reported.</h1>
      <p className="introduction-note">Original reporting on robots, the people building them, and the industry around them.</p>
    </section>
    <HomeFeed articles={articles} syncUrl />
  </main>;
}
