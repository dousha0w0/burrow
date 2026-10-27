import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n";

const ROOT = path.resolve(__dirname, "../src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "locales" ? [] : walk(full);
    return /\.(vue|ts)$/.test(entry.name) ? [full] : [];
  });
}

/** Static lookup keys only; template-literal keys are checked by their caller. */
function usedKeys(): string[] {
  const pattern = /\$?\bt\(\s*["'`]([\w.-]+)["'`]/g;
  const keys = new Set<string>();
  for (const file of walk(ROOT)) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) keys.add(match[1]);
  }
  return [...keys].sort();
}

function hasKey(messages: Record<string, unknown>, key: string): boolean {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string";
}

describe("i18n", () => {
  const keys = usedKeys();

  it("finds the keys the UI asks for", () => {
    expect(keys.length).toBeGreaterThan(80);
  });

  for (const locale of ["zh-CN", "en"] as const) {
    it(`resolves every static key in ${locale}`, () => {
      const messages = i18n.global.getLocaleMessage(locale) as Record<string, unknown>;
      const missing = keys.filter((key) => !hasKey(messages, key));
      expect(missing).toEqual([]);
    });
  }
});
