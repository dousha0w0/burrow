import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const bridge = fs.readFileSync(path.join(ROOT, "src/lib/bridge.ts"), "utf8");
const lib = fs.readFileSync(path.join(ROOT, "src-tauri/src/lib.rs"), "utf8");

/** Every `call<T>("name", …)` in the bridge must appear in generate_handler!. */
function invokedCommands(): string[] {
  return [...bridge.matchAll(/call<[^>]+>\("([a-z0-9_]+)"/g)].map((match) => match[1]);
}

function registeredCommands(): Set<string> {
  const handler = lib.slice(lib.indexOf("generate_handler!"));
  return new Set([...handler.matchAll(/([a-z_]+::[a-z0-9_]+),/g)].map((match) => match[1].split("::")[1]));
}

describe("tauri command registry", () => {
  it("registers every command the webview invokes", () => {
    const missing = invokedCommands().filter((command) => !registeredCommands().has(command));
    expect(missing).toEqual([]);
  });

  it("finds both sides of the contract", () => {
    expect(invokedCommands().length).toBeGreaterThan(15);
    expect(registeredCommands().size).toBeGreaterThan(15);
  });
});
