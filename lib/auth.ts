export const AUTH_RETURN_KEY = "mindbot-return";

export function safeAuthReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://mindbot.invalid");
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.includes("\\") || decodedPath.startsWith("//") || decodedPath.split("/").some(part => part === "." || part === "..")) return "/";
    if (url.pathname !== "/" && !/^\/(news|community|jobs)(\/|$)/.test(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function authErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

export function googleDisplayName(metadata: Record<string, unknown>): string {
  for (const value of [metadata.full_name, metadata.name]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Member";
}

export async function completeGoogleSignIn(
  url: URL,
  exchange: (code: string) => Promise<{ error: unknown }>,
): Promise<void> {
  const query = url.searchParams;
  const fragment = new URLSearchParams(url.hash.slice(1));
  for (const params of [query, fragment]) {
    if (params.has("error") || params.has("error_code")) {
      if (params.get("error") === "access_denied") throw new Error("Google sign-in was cancelled. Please try again.");
      throw new Error(params.get("error_description") || "Unable to sign in with Google. Please try again.");
    }
  }
  const code = query.get("code");
  if (!code) throw new Error("Missing sign-in code. Please try again.");
  const { error } = await exchange(code);
  if (error) {
    const errorCode = typeof error === "object" && "code" in error ? error.code : undefined;
    const errorName = typeof error === "object" && "name" in error ? error.name : undefined;
    if (["flow_state_not_found", "flow_state_expired", "bad_code_verifier", "validation_failed", "pkce_verifier_missing"].includes(String(errorCode)) || errorName === "AuthPKCECodeVerifierMissingError") {
      throw new Error("This sign-in link expired or has already been used. Please try again in the same browser.");
    }
    throw new Error(authErrorMessage(error, "Unable to sign in. Please try again."));
  }
}
