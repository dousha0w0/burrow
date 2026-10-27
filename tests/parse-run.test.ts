import { describe, expect, it } from "vitest";
import { groupCleanPreview, stripAnsi, summarizeRun } from "@/lib/parse-run";

describe("stripAnsi", () => {
  it("removes colour codes and carriage returns but keeps text", () => {
    expect(stripAnsi("\u001b[32m✓\u001b[0m cache\r\n")).toBe("✓ cache\n");
  });
});

describe("summarizeRun", () => {
  it("reads a clean preview summary", () => {
    const summary = summarizeRun(
      "clean",
      true,
      "\u001b[33mDry Run Mode\u001b[0m, Preview only\nPotential space: \u001b[32m5.01GB\u001b[0m | Items: 356 | Categories: 6\n",
    );
    expect(summary).toMatchObject({ size: "5.01GB", items: 356, categories: 6, preview: true });
  });

  it("reads a real clean summary and its free-space note", () => {
    const summary = summarizeRun(
      "clean",
      false,
      "Tracked cleanup: 14.24GB | Items cleaned: 442\nFree space: 606.4 GB (+14.24 GB)\n",
    );
    expect(summary.size).toBe("14.24GB");
    expect(summary.items).toBe(442);
    expect(summary.notes).toContain("606.4 GB (+14.24 GB)");
  });

  it("flags the non-interactive sudo skip", () => {
    const summary = summarizeRun("clean", false, "  ◦ System-level cleanup skipped, requires sudo\nTracked cleanup: 1.2GB\n");
    expect(summary.notes).toContain("system-skipped");
  });

  it("distinguishes purge preview from a real purge", () => {
    expect(summarizeRun("purge", true, "Would free approximately: 7.85GB | Items: 117 | Free: 606.77GB\n")).toMatchObject({
      size: "7.85GB",
      items: 117,
    });
    expect(summarizeRun("purge", false, "Estimated space freed: 7.85GB | Items: 117\n").size).toBe("7.85GB");
  });

  it("keeps a partial size marker", () => {
    expect(summarizeRun("clean", true, "Potential space: 3.4GB+ | Items: 12 | Categories: 2\n").size).toBe("3.4GB+");
  });

  it("reports nothing when the run printed no summary", () => {
    expect(summarizeRun("clean", false, "boom\n").size).toBeNull();
  });
});

describe("groupCleanPreview", () => {
  it("groups headings and item rows with size and path", () => {
    const sections = groupCleanPreview([
      "\u001b[35m➤ Apps & utilities\u001b[0m",
      "  \u001b[33m→\u001b[0m Zsh completion cache · 57KB dry",
      "  \u001b[33m→\u001b[0m Alfred cache · 2 items, 0B dry",
      "➤ Virtualization",
      "  ✓ Nothing to clean",
      "➤ Large files",
      "  ⊙ pnpm store · 7.99GB · ~/Library/pnpm/store",
      "========",
      "Potential space: 5.01GB | Items: 356 | Categories: 6",
    ]);

    expect(sections.map((section) => section.title)).toEqual(["Apps & utilities", "Virtualization", "Large files"]);
    expect(sections[0].items[0]).toMatchObject({ label: "Zsh completion cache", meta: "57KB dry", tone: "item" });
    expect(sections[1].items[0]).toMatchObject({ tone: "skip" });
    expect(sections[2].items[0]).toMatchObject({ label: "pnpm store", path: "~/Library/pnpm/store", tone: "note" });
  });

  it("ignores trailing separators and summary lines", () => {
    const sections = groupCleanPreview(["➤ Empty", "====", "Dry run complete - no changes made"]);
    expect(sections).toHaveLength(1);
    expect(sections[0].items).toHaveLength(0);
  });
});
