import Link from "next/link";

export default function Community() {
  return <main>
    <section className="introduction page-introduction" aria-labelledby="community-title">
      <p className="eyebrow"><span />Community</p>
      <h1 id="community-title">Discussions are moving in.</h1>
      <p className="introduction-note">Topics, questions, and build notes will live here soon.</p>
    </section>
    <section className="placeholder-panel" aria-label="Community status">
      <p>Until then, the conversation happens under each article. Open comments on any story to join in.</p>
      <Link className="chip-link" href="/news/">Browse the news →</Link>
    </section>
  </main>;
}
