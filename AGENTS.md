# mindbot

- Use English for project text unless explicitly localized; article prose is Korean. Keep identifiers, slugs, front matter keys, and categories in English.
- Write original reporting from corroborated evidence. Keep supporting `sources` (title/URL) in article front matter, never in reader-facing output.
- Every published article needs a visual from a verified official source. Use original media URLs and verify video uploaders.
- Current: Next.js static export on Cloudflare Workers, Markdown articles in Git, Supabase Google auth/comments. The forum upgrade is locally tested, not remotely applied.
- Target: static articles/jobs and SSR community through OpenNext. Jobs are operator-curated without comments; Flarum is a design reference only.
- Before Next.js changes, read the relevant guide in `node_modules/next/dist/docs/`.
- Details: [operations](docs/operations.md), [schema](SCHEMA.md), [design](DESIGN.md), [tasks](TODO.txt).
- Commit only task-required files. Never commit secrets, build output, or `flarum/`; exclude `AGENTS.md` and unfinished assets unless requested.
