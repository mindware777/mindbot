"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "./auth-button";
import ThemeToggle from "./theme-toggle";
const links = [
  { href: "/", label: "Home", active: (pathname: string) => pathname === "/" },
  { href: "/news/", label: "News", active: (pathname: string) => pathname.startsWith("/news") },
  // Hidden until the forum ships; /community/ stays reachable by direct URL.
  // { href: "/community/", label: "Community", active: (pathname: string) => pathname.startsWith("/community") },
  { href: "/jobs/", label: "Jobs", active: (pathname: string) => pathname.startsWith("/jobs") },
];
export default function SiteHeader() {
  const pathname = usePathname();
  return <header className="site-header-bar">
    <div className="site-shell site-header">
      <Link className="brand" href="/" aria-label="mindbot home">
        <span className="brand-symbol" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none"><path d="M16 7V3m-2 0h4M7 14H4v7h3m18-7h3v7h-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><rect x="7" y="8" width="18" height="18" rx="6" stroke="currentColor" strokeWidth="1.7"/><circle cx="12.5" cy="16" r="1.5" fill="currentColor"/><circle cx="19.5" cy="16" r="1.5" fill="currentColor"/><path d="M13 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        </span>
        <span>mindbot<span className="brand-period">.</span></span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        {links.map(link => <Link key={link.href} href={link.href} aria-current={link.active(pathname) ? "page" : undefined}>{link.label}</Link>)}
      </nav>
      <div className="site-controls">
        <ThemeToggle />
        <AuthButton />
      </div>
    </div>
  </header>;
}
