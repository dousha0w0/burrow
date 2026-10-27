import type { SpaceEntry } from "@/types/mole";

export interface ShareIndex {
  parentOf: (entry: SpaceEntry) => SpaceEntry | null;
  topLevel: SpaceEntry[];
  topLevelTotal: number;
  nestedTotal: number;
  /** Percentage within the row's basis: parent for nested rows, top level otherwise. */
  share: (entry: SpaceEntry) => number;
}

/**
 * Mole's machine overview lists big nested folders (`~/Library`, caches) next to
 * `Home`, so `size / total` would count the same bytes twice. Nested rows are
 * measured against their parent instead and excluded from the top-level 100%.
 */
export function indexShares(entries: SpaceEntry[], fallbackTotal = 0): ShareIndex {
  const parents = new Map<string, SpaceEntry>();
  for (const entry of entries) {
    if (!entry.is_dir) continue;
    const parent = entries.find(
      (other) =>
        other.is_dir && other.path !== entry.path && entry.path.startsWith(`${other.path.replace(/\/+$/, "")}/`),
    );
    if (parent) parents.set(entry.path, parent);
  }

  const topLevel = entries.filter((entry) => !parents.has(entry.path));
  const topLevelTotal = topLevel.reduce((sum, entry) => sum + entry.size, 0) || fallbackTotal;
  const nestedTotal = entries
    .filter((entry) => parents.has(entry.path))
    .reduce((sum, entry) => sum + entry.size, 0);

  return {
    parentOf: (entry) => parents.get(entry.path) ?? null,
    topLevel,
    topLevelTotal,
    nestedTotal,
    share: (entry) => {
      const parent = parents.get(entry.path);
      if (parent) return parent.size > 0 ? (entry.size / parent.size) * 100 : 0;
      return topLevelTotal > 0 ? (entry.size / topLevelTotal) * 100 : 0;
    },
  };
}
