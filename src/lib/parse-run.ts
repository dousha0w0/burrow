/**
 * Pure parsers for Mole's streamed CLI output. Mole has no `--json` for
 * clean/purge, so the summary block is scraped here — one place, covered by
 * tests, tolerant of ANSI and of both preview and real-run wording.
 */
import type { RunKind, RunSummary } from "@/types/mole";

const ANSI = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

export function stripAnsi(input: string): string {
  return input.replace(ANSI, "").replace(/\r/g, "");
}

const SIZE = "([0-9.,]+\\s*[KMGT]?B\\+?)";

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse the closing summary the engine prints for one run. */
export function summarizeRun(kind: RunKind, preview: boolean, rawText: string): RunSummary {
  const text = stripAnsi(rawText);
  const summary: RunSummary = { size: null, items: null, categories: null, preview, notes: [] };

  if (kind === "clean") {
    if (preview) {
      const line = new RegExp(`Potential space:\\s*${SIZE}`).exec(text);
      const counts = /Items:\s*(\d+)\s*\|\s*Categories:\s*(\d+)/.exec(text);
      summary.size = line?.[1]?.trim() ?? null;
      summary.items = toNumber(counts?.[1]);
      summary.categories = toNumber(counts?.[2]);
      if (/No significant reclaimable space detected/i.test(text)) summary.notes.push("already-clean");
    } else {
      const line = new RegExp(`Tracked cleanup:\\s*${SIZE}`).exec(text);
      const items = /Items cleaned:\s*(\d+)/.exec(text);
      summary.size = line?.[1]?.trim() ?? null;
      summary.items = toNumber(items?.[1]);
      if (/System was already clean/i.test(text)) summary.notes.push("already-clean");
      if (/System-level cleanup skipped, requires sudo/i.test(text)) summary.notes.push("system-skipped");
    }
  } else {
    if (preview) {
      const line = new RegExp(`Would free approximately:\\s*${SIZE}`).exec(text);
      const items = /Items:\s*(\d+)/.exec(text);
      summary.size = line?.[1]?.trim() ?? null;
      summary.items = toNumber(items?.[1]);
    } else {
      const line = new RegExp(`Estimated space freed:\\s*${SIZE}`).exec(text);
      summary.size = line?.[1]?.trim() ?? null;
    }
  }

  const free = /Free space:\s*(.+)$/m.exec(text);
  if (free?.[1]) summary.notes.push(free[1].trim());

  return summary;
}

export interface PreviewItem {
  label: string;
  meta: string | null;
  path: string | null;
  tone: "item" | "skip" | "note";
}

export interface PreviewSection {
  title: string;
  items: PreviewItem[];
}

/**
 * Group `clean --dry-run` output into sections so the UI can render cards
 * instead of a wall of terminal text. Unknown lines are ignored, not dropped
 * from the raw log the user can still open.
 */
export function groupCleanPreview(rawLines: string[]): PreviewSection[] {
  const sections: PreviewSection[] = [];
  let current: PreviewSection | null = null;

  for (const raw of rawLines) {
    const line = stripAnsi(raw).trimEnd();
    if (!line) continue;

    const heading = /^\s*[➤>]\s*(.+)$/.exec(line);
    if (heading) {
      current = { title: heading[1].trim(), items: [] };
      sections.push(current);
      continue;
    }

    if (!current) continue;

    const item = /^\s*(?:→|⊙)\s*(.+)$/.exec(line);
    if (item) {
      const body = item[1].trim();
      const parts = body.split(/\s+·\s+/);
      const label = parts[0] ?? body;
      const size = parts.find((part) => /^[0-9.]+\s*[KMGT]?B\+?$/.test(part)) ?? null;
      const path = parts.find((part) => part.startsWith("~") || part.startsWith("/")) ?? null;
      const rest = parts.slice(1).filter((part) => part !== size && part !== path);
      current.items.push({
        label,
        meta: [size, ...rest].filter(Boolean).join(" · ") || null,
        path,
        tone: line.includes("→") ? "item" : "note",
      });
      continue;
    }

    const note = /^\s*(?:✓|◎|⚠|!)\s*(.+)$/.exec(line);
    if (note) {
      current.items.push({ label: note[1].trim(), meta: null, path: null, tone: "skip" });
    }
  }

  return sections.filter((section) => section.items.length > 0 || section.title.length > 0);
}
