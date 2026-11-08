"use client";
import { useState } from "react";
import type { EmploymentType, WorkMode } from "@/lib/jobs";
type Job = {
  id: string;
  companyId: string;
  title: string;
  summary: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  applyUrl: string;
};
const filters: Array<"All" | WorkMode> = ["All", "On-site", "Hybrid", "Remote"];
export default function JobList({ jobs, companies }: { jobs: Job[]; companies: Record<string, string> }) {
  const [selected, setSelected] = useState<"All" | WorkMode>("All");
  const visible = jobs.filter(job => selected === "All" || job.workMode === selected);
  return <section className="feed" aria-label="Job listings">
    <div className="feed-toolbar"><div className="categories" role="group" aria-label="Work mode">
      {filters.map(filter => <button key={filter} className="category-button" aria-pressed={selected === filter} aria-controls="job-list" onClick={() => setSelected(filter)}>{filter}</button>)}
    </div></div>
    <div id="job-list" className="article-list" aria-live="polite">
      {visible.map(job => <article className="job" key={job.id}>
        <p className="job-company">{companies[job.companyId]}</p>
        <h2 className="job-title"><a href={job.applyUrl} rel="noopener noreferrer" target="_blank">{job.title}</a></h2>
        <p className="article-summary">{job.summary}</p>
        <p className="job-meta"><span>{job.location}</span><span>{job.workMode}</span><span>{job.employmentType}</span></p>
        <a className="job-apply" href={job.applyUrl} rel="noopener noreferrer" target="_blank">Official careers page ↗</a>
      </article>)}
      {!visible.length && <p>No listings in this category yet.</p>}
    </div>
  </section>;
}
