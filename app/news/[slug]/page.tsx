import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { parseContent, type ContentSegment, publishedArticles } from "@/lib/articles";
import Comments from "./comments";
export const dynamicParams = false;
export function generateStaticParams() { return publishedArticles().map(({slug}) => ({slug})); }
export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const article = publishedArticles().find(article => article.slug === slug);
  if (!article) return {title: "Not found"};
  const segment = parseContent(article.content).find(segment => segment.kind === "video");
  const image = segment?.kind === "video" ? [`https://i.ytimg.com/vi/${segment.id}/hqdefault.jpg`] : undefined;
  return {
    title: `${article.title} — mindbot`,
    description: article.summary,
    openGraph: {title: article.title, description: article.summary, publishedTime: article.publishedAt, images: image},
    twitter: {card: "summary_large_image"},
  };
}
function Segment({segment}: {segment: ContentSegment}) {
  if (segment.kind === "video") return <figure className="video-block"><iframe src={`https://www.youtube.com/embed/${segment.id}`} title="YouTube video" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></figure>;
  return <ReactMarkdown skipHtml>{segment.text}</ReactMarkdown>;
}
export default async function ArticlePage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const article = publishedArticles().find(article => article.slug === slug);
  if (!article) notFound();
  return <main className="site-shell reading-page"><Link href="/">← mindbot</Link><article className="prose"><p className="article-category tone-green">{article.category}</p><h1>{article.title}</h1><p className="article-summary">{article.summary}</p><time dateTime={article.publishedAt}>{article.publishedAt.slice(0,10)}</time>{parseContent(article.content).map((segment, index) => <Segment key={index} segment={segment}/>)}</article><Comments articleId={article.id}/></main>;
}
