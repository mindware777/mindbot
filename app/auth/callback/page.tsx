"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AUTH_RETURN_KEY, authErrorMessage, completeGoogleSignIn, safeAuthReturnPath } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
export default function Callback() {
  const completion = useRef<Promise<void> | null>(null);
  const [message, setMessage] = useState("Completing sign-in…");
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    let active = true;
    // React development effects replay; an OAuth code can only be used once.
    completion.current ??= completeGoogleSignIn(new URL(location.href), code => getSupabase().auth.exchangeCodeForSession(code));
    void completion.current.then(() => {
      if (!active) return;
      const path = safeAuthReturnPath(sessionStorage.getItem(AUTH_RETURN_KEY));
      sessionStorage.removeItem(AUTH_RETURN_KEY);
      location.replace(path);
    }).catch(failure => {
      if (!active) return;
      setFailed(true);
      setMessage(authErrorMessage(failure, "Unable to sign in. Please try again."));
    });
    return () => { active = false; };
  }, []);

  async function retry() {
    setRetrying(true);
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback/` } });
      if (error) throw error;
    } catch (failure) {
      setMessage(authErrorMessage(failure, "Unable to sign in. Please try again."));
      setRetrying(false);
    }
  }

  return <main className="site-shell reading-page"><h1>Google sign-in</h1><p role={failed ? "alert" : "status"}>{message}</p>{failed && <p><button type="button" className="chip-button" disabled={retrying} onClick={() => void retry()}>Try again</button></p>}<Link href="/">Return home</Link></main>;
}
