"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
export default function Callback() {
  const started = useRef(false), [message,setMessage] = useState("Completing sign-in…");
  useEffect(() => {
    if(started.current) return; started.current=true;
    void (async () => {try {
      const params = new URLSearchParams(location.search);
      if(params.has("error")) throw new Error(params.get("error_description") || "Login was cancelled.");
      const code = params.get("code"); if(!code) throw new Error("Missing login code. Please sign in again.");
      const {error} = await getSupabase().auth.exchangeCodeForSession(code); if(error) throw error;
      const path = sessionStorage.getItem("mindbot-return"); sessionStorage.removeItem("mindbot-return");
      location.replace(path?.startsWith("/news/") && !path.includes("\\") ? path : "/");
    } catch(error) {setMessage(error instanceof Error ? error.message : "Unable to sign in.");}})();
  },[]);
  return <main className="site-shell reading-page"><h1>Google sign-in</h1><p role="status">{message}</p><Link href="/">Return home</Link></main>;
}
