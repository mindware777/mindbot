export type Company = {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string;
  careersUrl: string;
};
export type WorkMode = "On-site" | "Hybrid" | "Remote";
export type EmploymentType = "Full-time" | "Contract" | "Internship";
export type JobPosting = {
  id: string;
  slug: string;
  companyId: string;
  title: string;
  summary: string;
  description: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  sourceUrl: string;
  applyUrl: string;
  publishedAt: string;
  closesAt?: string;
  draft: boolean;
};
// Example postings for layout review. Operators must replace these with
// verified openings from each company's official careers page.
export const companies: Company[] = [
  { id: "rainbow-robotics", slug: "rainbow-robotics", name: "Rainbow Robotics", websiteUrl: "https://www.rainbow-robotics.com/", careersUrl: "https://www.rainbow-robotics.com/kr/recruit" },
  { id: "doosan-robotics", slug: "doosan-robotics", name: "Doosan Robotics", websiteUrl: "https://www.doosanrobotics.com/kr/", careersUrl: "https://www.doosanrobotics.com/kr/" },
  { id: "robotis", slug: "robotis", name: "Robotis", websiteUrl: "https://www.robotis.com/", careersUrl: "https://www.robotis.com/" },
  { id: "naver-labs", slug: "naver-labs", name: "NAVER LABS", websiteUrl: "https://www.naverlabs.com/", careersUrl: "https://www.naverlabs.com/" },
  { id: "hyundai-mobis", slug: "hyundai-mobis", name: "Hyundai Mobis", websiteUrl: "https://www.mobis.co.kr/", careersUrl: "https://www.mobis.co.kr/" },
  { id: "samsung-sdi", slug: "samsung-sdi", name: "Samsung SDI", websiteUrl: "https://www.samsungsdi.co.kr/", careersUrl: "https://www.samsungsdi.co.kr/" },
  { id: "lg-electronics", slug: "lg-electronics", name: "LG Electronics", websiteUrl: "https://www.lge.co.kr/", careersUrl: "https://www.lge.co.kr/" },
];
export const jobs: JobPosting[] = [
  { id: "rb-humanoid-control", slug: "rainbow-humanoid-control", companyId: "rainbow-robotics", title: "휴머노이드 로봇 제어 개발", summary: "보행·전신 제어 스택을 설계하고 실기 검증까지 담당합니다.", description: "휴머노이드 플랫폼의 제어 소프트웨어를 개발합니다. ROS 2 기반 제어 파이프라인, 시뮬레이션 검증, 실기 튜닝 경험을 우대합니다.", location: "대전", workMode: "On-site", employmentType: "Full-time", sourceUrl: "https://www.rainbow-robotics.com/kr/recruit", applyUrl: "https://www.rainbow-robotics.com/kr/recruit", publishedAt: "2026-11-07", draft: false },
  { id: "doosan-cobot-sw", slug: "doosan-cobot-software", companyId: "doosan-robotics", title: "협동로봇 소프트웨어 엔지니어", summary: "협동로봇 제어·인터페이스 소프트웨어를 개발합니다.", description: "협동로봇 제품의 제어 소프트웨어와 사용자 인터페이스를 개발합니다. C++/Python 실무 경험과 로봇 응용 이해를 우대합니다.", location: "서울", workMode: "On-site", employmentType: "Full-time", sourceUrl: "https://www.doosanrobotics.com/kr/", applyUrl: "https://www.doosanrobotics.com/kr/", publishedAt: "2026-11-07", draft: false },
  { id: "robotis-actuator", slug: "robotis-actuator-hardware", companyId: "robotis", title: "로봇 액추에이터 하드웨어 엔지니어", summary: "다이나믹셀 계열 액추에이터의 회로·구동 설계를 담당합니다.", description: "로봇용 액추에이터의 하드웨어 설계와 검증을 담당합니다. 모터 제어 회로, 열 설계, 양산 검증 경험을 우대합니다.", location: "서울", workMode: "On-site", employmentType: "Full-time", sourceUrl: "https://www.robotis.com/", applyUrl: "https://www.robotis.com/", publishedAt: "2026-11-07", draft: false },
  { id: "naverlabs-robot-ai", slug: "naverlabs-robot-ai", companyId: "naver-labs", title: "로봇 자율주행 연구", summary: "실내외 자율주행 인지·판단 알고리즘을 연구합니다.", description: "로봇 자율주행을 위한 인지·측위·계획 알고리즘을 연구합니다. SLAM, 3D 비전, 강화학습 연구 경험을 우대합니다.", location: "성남", workMode: "Hybrid", employmentType: "Full-time", sourceUrl: "https://www.naverlabs.com/", applyUrl: "https://www.naverlabs.com/", publishedAt: "2026-11-07", draft: false },
  { id: "mobis-actuator", slug: "mobis-actuator-system", companyId: "hyundai-mobis", title: "로봇 액추에이터 시스템 개발", summary: "휴머노이드용 액추에이터 모듈을 개발합니다.", description: "휴머노이드 로봇용 액추에이터 시스템의 설계·검증을 담당합니다. 기구·제어·양산 협업 경험을 우대합니다.", location: "경기", workMode: "On-site", employmentType: "Full-time", sourceUrl: "https://www.mobis.co.kr/", applyUrl: "https://www.mobis.co.kr/", publishedAt: "2026-11-07", draft: false },
  { id: "sdi-battery-process", slug: "samsung-sdi-battery-process", companyId: "samsung-sdi", title: "배터리 셀 공정 엔지니어", summary: "원통형 셀 공정 개선과 품질 검증을 담당합니다.", description: "로봇·전동화용 원통형 배터리 셀 생산 공정의 안정화와 품질 개선을 담당합니다.", location: "천안", workMode: "On-site", employmentType: "Full-time", sourceUrl: "https://www.samsungsdi.co.kr/", applyUrl: "https://www.samsungsdi.co.kr/", publishedAt: "2026-11-07", draft: false },
  { id: "lge-service-robot", slug: "lg-service-robot-software", companyId: "lg-electronics", title: "서비스 로봇 소프트웨어 개발", summary: "서비스 로봇의 응용 소프트웨어와 원격 운용 기능을 개발합니다.", description: "서비스 로봇 응용 소프트웨어와 운영 도구를 개발합니다. 임베디드 리눅스와 네트워크 프로그래밍 경험을 우대합니다.", location: "서울", workMode: "Hybrid", employmentType: "Full-time", sourceUrl: "https://www.lge.co.kr/", applyUrl: "https://www.lge.co.kr/", publishedAt: "2026-11-07", draft: false },
];
function assertValid(data: { companies: Company[]; jobs: JobPosting[] }) {
  const companyIds = new Set(data.companies.map(company => company.id));
  const ids = new Set<string>(), slugs = new Set<string>();
  for (const company of data.companies) {
    if (!/^https:\/\//.test(company.websiteUrl) || !/^https:\/\//.test(company.careersUrl)) throw new Error(`Company ${company.id}: invalid URL`);
    if (!company.name.trim()) throw new Error(`Company ${company.id}: missing name`);
  }
  for (const job of data.jobs) {
    if (!companyIds.has(job.companyId)) throw new Error(`Job ${job.id}: unknown company ${job.companyId}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.slug)) throw new Error(`Job ${job.id}: invalid slug`);
    if (!/^\d{4}-\d{2}-\d{2}(T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(job.publishedAt) || !Number.isFinite(Date.parse(job.publishedAt))) throw new Error(`Job ${job.id}: publishedAt needs an ISO date`);
    if (!/^https:\/\//.test(job.applyUrl) || !/^https:\/\//.test(job.sourceUrl)) throw new Error(`Job ${job.id}: invalid URL`);
    if (ids.has(job.id) || slugs.has(job.slug)) throw new Error(`Job ${job.id}: duplicate id or slug`);
    ids.add(job.id); slugs.add(job.slug);
  }
}
assertValid({ companies, jobs });
export function visibleJobs(now = new Date()) {
  return jobs.filter(job => !job.draft && (!job.closesAt || Date.parse(job.closesAt) >= now.getTime()));
}
