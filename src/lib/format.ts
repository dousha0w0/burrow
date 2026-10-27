const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value < 1024) return `${value} B`;
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < UNITS.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  const decimals = amount >= 100 ? 0 : digits;
  return `${amount.toFixed(decimals)} ${UNITS[unit]}`;
}

/** Mole prints sizes like `5.01GB`; keep the digits, normalise the unit space. */
export function formatEngineSize(size: string | null | undefined): string {
  if (!size) return "—";
  return size.replace(/([KMGT]?B)$/, " $1");
}

export function formatRate(megabytesPerSecond: number | null | undefined): string {
  if (!megabytesPerSecond || megabytesPerSecond <= 0) return "0 MB/s";
  if (megabytesPerSecond < 1) return `${(megabytesPerSecond * 1024).toFixed(0)} KB/s`;
  return `${megabytesPerSecond.toFixed(1)} MB/s`;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatUptime(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const DAY = 86_400_000;

export function formatDate(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "—";
  // Mole prints `2026-10-27 09:25:03` (local, space-separated).
  const date = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return iso ?? "—";
  const diff = now.getTime() - date.getTime();
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (diff < 0) return date.toLocaleDateString();
  if (diff < 60_000) return "刚刚";
  if (date.toDateString() === now.toDateString()) return time;
  const yesterday = new Date(now.getTime() - DAY);
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`;
  const year = date.getFullYear() === now.getFullYear() ? "" : `${date.getFullYear()}/`;
  return `${year}${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function durationBetween(start: string, end: string): string {
  if (!start || !end) return "—";
  const a = new Date(start.replace(" ", "T")).getTime();
  const b = new Date(end.replace(" ", "T")).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return "—";
  return formatDuration(b - a);
}

export function percentOf(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

export function shortPath(path: string, home: string): string {
  if (!path) return "";
  if (home && path.startsWith(home)) return `~${path.slice(home.length)}`;
  return path;
}
