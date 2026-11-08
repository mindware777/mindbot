"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AUTH_RETURN_KEY, authErrorMessage, googleDisplayName, safeAuthReturnPath } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
type SignedIn = { id: string; name: string };
export default function AuthButton() {
  const [user, setUser] = useState<SignedIn | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessionFailed, setSessionFailed] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let revision = 0;
    let authEvents = 0;
    let client: ReturnType<typeof getSupabase>;
    try {
      client = getSupabase();
    } catch (failure) {
      queueMicrotask(() => {
        if (!active) return;
        setUser(null);
        setSessionFailed(true);
        setError(authErrorMessage(failure, "Unable to load your session. Please retry."));
      });
      return () => { active = false; };
    }

    function syncUser(authUser: User | null) {
      const current = ++revision;
      if (!active) return;
      setSessionFailed(false);
      setError("");
      setUser(authUser ? { id: authUser.id, name: googleDisplayName(authUser.user_metadata) } : null);
      if (!authUser) return;
      // Profile availability must not delay or prevent a successful login.
      // Defer the request until the auth notification has finished.
      void Promise.resolve().then(async () => {
        const { data, error } = await client.from("profiles").select("display_name").eq("id", authUser.id).maybeSingle();
        if (active && current === revision && !error && data?.display_name?.trim()) {
          setUser({ id: authUser.id, name: data.display_name });
        }
      }).catch(() => { /* Keep the Google name when profiles are unavailable. */ });
    }

    const { data } = client.auth.onAuthStateChange((event, session) => {
      // The explicit session read below also exposes initialization errors.
      if (event === "INITIAL_SESSION") return;
      authEvents++;
      syncUser(session?.user ?? null);
    });
    const initialEvents = authEvents;
    void client.auth.getSession().then(({ data, error }) => {
      if (!active || authEvents !== initialEvents) return;
      if (error) throw error;
      syncUser(data.session?.user ?? null);
    }).catch(failure => {
      if (!active || authEvents !== initialEvents) return;
      revision++;
      setUser(null);
      setSessionFailed(true);
      setError(authErrorMessage(failure, "Unable to load your session. Please retry."));
    });
    return () => {
      active = false;
      revision++;
      data.subscription.unsubscribe();
    };
  }, [sessionAttempt]);
  async function signIn() {
    setError("");
    setBusy(true);
    try {
      // A retry from the callback keeps the original return destination.
      if (!location.pathname.startsWith("/auth/")) {
        sessionStorage.setItem(AUTH_RETURN_KEY, safeAuthReturnPath(`${location.pathname}${location.search}${location.hash}`));
      }
      const { error: failure } = await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback/` } });
      if (failure) throw failure;
    } catch (failure) {
      setError(authErrorMessage(failure, "Unable to sign in. Please try again."));
      setBusy(false);
    }
  }
  async function signOut() {
    setError("");
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (failure) {
      setError(authErrorMessage(failure, "Unable to sign out. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  if (user === undefined) return null;
  return <div className="auth-control">
    {user ? <><span className="auth-name">{user.name}</span><button type="button" className="chip-button" onClick={() => void signOut()} disabled={busy}>Sign out</button></> : <button type="button" className="chip-button" onClick={() => void signIn()} disabled={busy}>Continue with Google</button>}
    {sessionFailed && <button type="button" className="chip-button" onClick={() => { setError(""); setSessionFailed(false); setSessionAttempt(value => value + 1); }} disabled={busy}>Retry session</button>}
    {error && <span className="auth-error" role="alert">{error}</span>}
  </div>;
}
