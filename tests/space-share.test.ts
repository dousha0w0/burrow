import { describe, expect, it } from "vitest";
import { indexShares } from "@/lib/space-share";
import type { SpaceEntry } from "@/types/mole";

const GIB = 1024 ** 3;

/** The nine rows the engine returned for `/` on a 220 GiB overview. */
const entries: SpaceEntry[] = [
  { name: "Home", path: "/Users/ray", size: 129.4 * GIB, is_dir: true, scan_status: "complete" },
  { name: "Applications", path: "/Applications", size: 42.2 * GIB, is_dir: true, scan_status: "complete" },
  { name: "User Library", path: "/Users/ray/Library", size: 39.8 * GIB, is_dir: true, scan_status: "complete" },
  { name: "uv Cache", path: "/Users/ray/.cache/uv", size: 2.9 * GIB, is_dir: true, scan_status: "complete", insight: true },
  { name: "System Library", path: "/Library", size: 2.3 * GIB, is_dir: true, scan_status: "partial" },
  { name: "Docker Data", path: "/Users/ray/Library/Containers/com.docker.docker/Data", size: 1.8 * GIB, is_dir: true, scan_status: "complete", insight: true },
  { name: "JetBrains Cache", path: "/Users/ray/Library/Caches/JetBrains", size: 1.3 * GIB, is_dir: true, scan_status: "complete", insight: true },
  { name: "System Logs", path: "/Users/ray/Library/Logs", size: 0.44 * GIB, is_dir: true, scan_status: "complete", insight: true },
  { name: "Xcode Simulators", path: "/Users/ray/Library/Developer/CoreSimulator/Devices", size: 0.19 * GIB, is_dir: true, scan_status: "complete", insight: true },
];

describe("indexShares", () => {
  const index = indexShares(entries);

  it("detects rows nested inside another row", () => {
    const nested = entries.filter((entry) => index.parentOf(entry)).map((entry) => entry.name);
    expect(nested).toEqual(["User Library", "uv Cache", "Docker Data", "JetBrains Cache", "System Logs", "Xcode Simulators"]);
    expect(index.parentOf(entries[2])?.name).toBe("Home");
    expect(index.parentOf(entries[1])).toBeNull();
  });

  it("measures top-level rows against the deduplicated total", () => {
    expect(index.topLevel.map((entry) => entry.name)).toEqual(["Home", "Applications", "System Library"]);
    const home = entries[0];
    const apps = entries[1];
    expect(index.share(home)).toBeCloseTo((129.4 / 173.9) * 100, 1);
    expect(index.share(apps)).toBeCloseTo((42.2 / 173.9) * 100, 1);
    const topSum = index.topLevel.reduce((sum, entry) => sum + index.share(entry), 0);
    expect(topSum).toBeCloseTo(100, 0);
  });

  it("measures nested rows against their parent", () => {
    expect(index.share(entries[2])).toBeCloseTo((39.8 / 129.4) * 100, 1);
    expect(index.nestedTotal).toBeCloseTo(46.43 * GIB, 1);
  });

  it("does not treat a sibling prefix as a parent", () => {
    const siblings: SpaceEntry[] = [
      { name: "Library", path: "/Library", size: 10, is_dir: true, scan_status: "complete" },
      { name: "Libraries", path: "/Libraries", size: 5, is_dir: true, scan_status: "complete" },
    ];
    const siblingIndex = indexShares(siblings);
    expect(siblingIndex.nestedTotal).toBe(0);
    expect(siblingIndex.share(siblings[1])).toBeCloseTo(33.3, 1);
  });
});
