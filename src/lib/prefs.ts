import type { ViewId } from "@/types/ui";

export type ThemeMode = "light" | "dark" | "system";
export type Palette = "neutral" | "graphite" | "vscode";
export type Corners = "default" | "small" | "none";
export type LayoutMode = "classic" | "separated";
export type Density = "comfortable" | "compact";

export interface UiPreferences {
  themeMode: ThemeMode;
  palette: Palette;
  corners: Corners;
  layout: LayoutMode;
  density: Density;
  refreshInterval: number;
  sidebarWidth: number;
  logHeight: number;
}

const STORAGE_KEY = "burrow.preferences";

export const DEFAULT_PREFERENCES: UiPreferences = {
  themeMode: "system",
  palette: "neutral",
  corners: "default",
  layout: "classic",
  density: "comfortable",
  refreshInterval: 2,
  sidebarWidth: 232,
  logHeight: 210,
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function sanitizePreferences(raw: Partial<UiPreferences> | null | undefined): UiPreferences {
  const merged = { ...DEFAULT_PREFERENCES, ...(raw ?? {}) };
  return {
    themeMode: pick(merged.themeMode, ["light", "dark", "system"] as const, DEFAULT_PREFERENCES.themeMode),
    palette: pick(merged.palette, ["neutral", "graphite", "vscode"] as const, DEFAULT_PREFERENCES.palette),
    corners: pick(merged.corners, ["default", "small", "none"] as const, DEFAULT_PREFERENCES.corners),
    layout: pick(merged.layout, ["classic", "separated"] as const, DEFAULT_PREFERENCES.layout),
    density: pick(merged.density, ["comfortable", "compact"] as const, DEFAULT_PREFERENCES.density),
    refreshInterval: clamp(merged.refreshInterval, 1, 10, DEFAULT_PREFERENCES.refreshInterval),
    sidebarWidth: clamp(merged.sidebarWidth, 204, 320, DEFAULT_PREFERENCES.sidebarWidth),
    logHeight: clamp(merged.logHeight, 120, 420, DEFAULT_PREFERENCES.logHeight),
  };
}

export function loadPreferences(): UiPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitizePreferences(raw ? (JSON.parse(raw) as Partial<UiPreferences>) : null);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: UiPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // storage unavailable: preferences stay in memory for this session
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Apply appearance to <html> before the first paint (index.html replays the
 * same values from localStorage) and keep the startup script's keys in sync.
 */
export function applyAppearance(preferences: UiPreferences): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  const dark = preferences.themeMode === "dark" || (preferences.themeMode === "system" && systemPrefersDark());
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.classList.toggle("palette-graphite", preferences.palette === "graphite");
  root.classList.toggle("palette-vscode", preferences.palette === "vscode");
  if (preferences.corners === "default") delete root.dataset.corners;
  else root.dataset.corners = preferences.corners;
  if (preferences.density === "compact") root.dataset.density = "compact";
  else delete root.dataset.density;
  if (preferences.layout === "separated") root.dataset.layout = "separated";
  else delete root.dataset.layout;

  try {
    localStorage.setItem("burrow.theme", preferences.themeMode);
    localStorage.setItem("burrow.palette", preferences.palette);
    localStorage.setItem("burrow.corners", preferences.corners);
    localStorage.setItem("burrow.density", preferences.density);
    localStorage.setItem("burrow.layout", preferences.layout);
  } catch {
    // ignore storage failures
  }
  return dark;
}

export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const listener = () => onChange();
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export type { ViewId };
