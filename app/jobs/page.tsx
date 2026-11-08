import { companies, visibleJobs } from "@/lib/jobs";
import JobList from "./job-list";

export default function Jobs() {
  const list = visibleJobs().map(({ id, companyId, title, summary, location, workMode, employmentType, applyUrl }) => ({ id, companyId, title, summary, location, workMode, employmentType, applyUrl }));
  const names = Object.fromEntries(companies.map(company => [company.id, company.name]));
  return <main>
    <section className="introduction page-introduction" aria-labelledby="jobs-title">
      <p className="eyebrow"><span />Jobs</p>
      <h1 id="jobs-title">Build robots, professionally.</h1>
      <p className="introduction-note">Example listings from Korean robotics companies. Always apply through the company&apos;s official page.</p>
    </section>
    <JobList jobs={list} companies={names} />
  </main>;
}
