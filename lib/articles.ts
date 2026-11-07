import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { categories, type ArticleMetadata } from "./article-types";
const VIDEO_MARKER = /^::video\s+([A-Za-z0-9_-]{11})$/m;
export type ContentSegment = { kind: "markdown"; text: string } | { kind: "video"; id: string };
export function parseContent(content = ""): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let markdown: string[] = [];
  for (const line of content.split("\n")) {
    const marker = VIDEO_MARKER.exec(line.trim());
    if (marker) {
      if (markdown.join("").trim()) segments.push({ kind: "markdown", text: markdown.join("\n") });
      markdown = [];
      segments.push({ kind: "video", id: marker[1] });
    } else markdown.push(line);
  }
  if (markdown.join("").trim()) segments.push({ kind: "markdown", text: markdown.join("\n") });
  return segments;
}
export function readArticles(directory = join(process.cwd(), "content/news")) {
  const ids = new Set<string>(), slugs = new Set<string>();
  return readdirSync(directory).filter(name => name.endsWith(".md")).map(name => {
    const { data, content } = matter(readFileSync(join(directory, name), "utf8"));
    const fail = (field: string): never => { throw new Error(`${name}: invalid ${field}`); };
    for (const key of ["id", "slug", "title", "summary", "category", "publishedAt"]) if (typeof data[key] !== "string" || !data[key].trim()) fail(key);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) fail("UUID");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) fail("slug");
    if (!categories.includes(data.category)) fail("category");
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(data.publishedAt) || !Number.isFinite(Date.parse(data.publishedAt))) fail("publishedAt");
    if (typeof data.draft !== "boolean") fail("draft");
    if (!content.trim()) fail("body");
    for (const line of content.split("\n")) if (line.trim().startsWith("::") && !VIDEO_MARKER.test(line.trim())) throw new Error(`${name}: unknown marker`);
    if (ids.has(data.id) || slugs.has(data.slug)) fail("duplicate UUID or slug");
    ids.add(data.id); slugs.add(data.slug);
    if (!data.draft && !VIDEO_MARKER.test(content) && !/!\[[^\]]*\]\([^)]+\)/.test(content)) throw new Error(`${name}: missing visual — add a "::video <YouTube-ID>" line or an image`);
    const metadata: ArticleMetadata = { id: data.id, slug: data.slug, title: data.title, summary: data.summary, category: data.category, publishedAt: data.publishedAt, draft: data.draft };
    return { ...metadata, content };
  }).sort((a,b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
export function publishedArticles() { return readArticles().filter(article => !article.draft); }
