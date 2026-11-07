"use client";
import { lazy, Suspense, useState } from "react";
const Thread = lazy(() => import("@/app/comment-thread"));
export default function Comments({articleId}: {articleId: string}) {
  const [open, setOpen] = useState(false);
  return <section className="comments" aria-label="Comments">{open ? <Suspense fallback={<p>Loading comments…</p>}><Thread articleId={articleId}/></Suspense> : <button className="category-button" onClick={() => setOpen(true)}>Open comments</button>}</section>;
}
