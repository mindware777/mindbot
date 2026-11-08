"use client";
import { useSyncExternalStore } from "react";
type Theme = "system" | "light" | "dark";
const order: Theme[] = ["system", "light", "dark"];
const labels: Record<Theme, string> = {
  system: "Theme: system. Click for light mode.",
  light: "Theme: light. Click for dark mode.",
  dark: "Theme: dark. Click for system theme.",
};
const icons: Record<Theme, string> = { system: "◐", light: "☀", dark: "☾" };
function read(): Theme {
  try {
    const stored = localStorage.getItem("mindbot-theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("mindbot-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("mindbot-theme-change", callback);
  };
}
export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, read, () => "system");
  function cycle() {
    const next = order[(order.indexOf(theme) + 1) % order.length];
    if (next === "system") {
      localStorage.removeItem("mindbot-theme");
      delete document.documentElement.dataset.theme;
    } else {
      localStorage.setItem("mindbot-theme", next);
      document.documentElement.dataset.theme = next;
    }
    window.dispatchEvent(new Event("mindbot-theme-change"));
  }
  return <button type="button" className="theme-toggle" onClick={cycle} aria-label={labels[theme]} title={labels[theme]}><span aria-hidden="true">{icons[theme]}</span></button>;
}
