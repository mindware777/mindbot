import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({ variable: "--font-noto", subsets: ["latin"], display: "swap" });
export const metadata: Metadata = {
  title: "mindbot — Read robotics. Think together.",
  description: "Robotics news, ideas, and conversations.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={noto.variable}><body>{children}</body></html>;
}
