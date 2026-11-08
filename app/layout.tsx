import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import SiteHeader from "./site-header";
const noto = Noto_Sans_KR({ variable: "--font-noto", subsets: ["latin"], display: "swap" });
export const metadata: Metadata = {
  title: "mindbot — Read robotics. Think together.",
  description: "Robotics news, ideas, and conversations.",
};
const themeScript = `try{var t=localStorage.getItem("mindbot-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={noto.variable} suppressHydrationWarning><body>
    <script dangerouslySetInnerHTML={{ __html: themeScript }} />
    <SiteHeader />
    <div className="site-shell">{children}</div>
    <footer className="site-shell site-footer"><span>mindbot</span><span>A small space for shared curiosity.</span></footer>
  </body></html>;
}
