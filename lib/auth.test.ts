import { expect, mock, test } from "bun:test";
import { authErrorMessage, completeGoogleSignIn, googleDisplayName, safeAuthReturnPath } from "./auth";

test("login returns to site sections with filters and anchors intact", () => {
  for (const path of ["/", "/?welcome=1", "/news/", "/news/story/?category=Robotics#comments", "/community/", "/community/topic/#post-2", "/jobs/?workMode=remote"]) {
    expect(safeAuthReturnPath(path)).toBe(path);
  }
});

test("login rejects external destinations, auth loops, and disguised paths", () => {
  for (const path of [null, "", "https://evil.example/", "//evil.example/", "/\\evil.example/", "/auth/callback/?code=old", "/settings/", "/newspaper/", "/news/../auth/callback/", "/news/%2e%2e/auth/callback/", "/news/%5cevil", "/news/%2e%2e%2fauth/callback/", "/news/%", " /news/", "/\nevil.example/"]) {
    expect(safeAuthReturnPath(path)).toBe("/");
  }
});

test("missing profiles fall back to Google names without exposing email", () => {
  expect(googleDisplayName({ full_name: "  Google Member  ", name: "Other" })).toBe("Google Member");
  expect(googleDisplayName({ full_name: " ", name: "Name" })).toBe("Name");
  expect(googleDisplayName({ full_name: 42, email: "private@example.com" })).toBe("Member");
  expect(authErrorMessage({ message: "Network unavailable" }, "Fallback")).toBe("Network unavailable");
  expect(authErrorMessage({}, "Fallback")).toBe("Fallback");
});

test("a successful callback exchanges only its code once", async () => {
  const exchange = mock(async () => ({ error: null }));
  await completeGoogleSignIn(new URL("http://localhost:3000/auth/callback/?code=test-code&sb_flow_id=flow"), exchange);
  expect(exchange).toHaveBeenCalledTimes(1);
  expect(exchange).toHaveBeenCalledWith("test-code");
});

test("cancellation and provider errors in query or fragment never exchange a code", async () => {
  const exchange = mock(async () => ({ error: null }));
  for (const suffix of ["?error=access_denied&code=unused", "#error=access_denied&error_description=Cancelled"]) {
    await expect(completeGoogleSignIn(new URL(`http://localhost:3000/auth/callback/${suffix}`), exchange)).rejects.toThrow("cancelled");
  }
  await expect(completeGoogleSignIn(new URL("http://localhost:3000/auth/callback/#error_code=server_error&error_description=Provider+unavailable"), exchange)).rejects.toThrow("Provider unavailable");
  await expect(completeGoogleSignIn(new URL("http://localhost:3000/auth/callback/"), exchange)).rejects.toThrow("Missing sign-in code");
  expect(exchange).not.toHaveBeenCalled();
});

test("expired, reused, and missing-verifier callbacks give a restart instruction", async () => {
  for (const error of [{ code: "flow_state_not_found" }, { code: "flow_state_expired" }, { code: "bad_code_verifier" }, { name: "AuthPKCECodeVerifierMissingError" }]) {
    await expect(completeGoogleSignIn(new URL("http://127.0.0.1:3000/auth/callback/?code=used-code"), async () => ({ error }))).rejects.toThrow("Please try again in the same browser");
  }
  await expect(completeGoogleSignIn(new URL("http://localhost:3000/auth/callback/?code=code"), async () => ({ error: { message: "Service unavailable" } }))).rejects.toThrow("Service unavailable");
});
