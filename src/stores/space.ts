import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/lib/bridge";
import { indexShares } from "@/lib/space-share";
import type { SpaceEntry, SpaceReport } from "@/types/mole";

export type SpaceSort = "size" | "name";

/** Overview (machine-wide) is addressed as `/`; every other path is a drill-down. */
export const useSpaceStore = defineStore("space", () => {
  const report = ref<SpaceReport | null>(null);
  const path = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const sort = ref<SpaceSort>("size");
  const history = ref<string[]>([]);
  let request = 0;

  async function open(target: string | null): Promise<void> {
    const ticket = ++request;
    loading.value = true;
    error.value = null;
    try {
      const next = await api.analyze(target);
      if (ticket !== request) return;
      report.value = next;
      path.value = target;
    } catch (cause) {
      if (ticket !== request) return;
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (ticket === request) loading.value = false;
    }
  }

  async function drill(entry: SpaceEntry): Promise<void> {
    if (!entry.is_dir) return;
    if (path.value) history.value.push(path.value);
    await open(entry.path);
  }

  async function up(): Promise<void> {
    const previous = history.value.pop();
    if (previous === undefined) return;
    await open(previous);
  }

  async function overview(): Promise<void> {
    history.value = [];
    await open(null);
  }

  async function cancel(): Promise<void> {
    await api.analyzeCancel().catch(() => {});
    request += 1;
    loading.value = false;
  }

  const entries = computed<SpaceEntry[]>(() => {
    const list = [...(report.value?.entries ?? [])];
    if (sort.value === "name") list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    else list.sort((a, b) => b.size - a.size);
    return list;
  });

  const totalSize = computed(() => report.value?.total_size ?? entries.value.reduce((sum, entry) => sum + entry.size, 0));
  const largest = computed(() => Math.max(1, ...entries.value.map((entry) => entry.size)));
  const canGoUp = computed(() => history.value.length > 0);

  /** Nested rows are measured against their parent, not the flat total. */
  const shares = computed(() => indexShares(entries.value, totalSize.value));
  const topLevel = computed(() => shares.value.topLevel);
  const topLevelTotal = computed(() => shares.value.topLevelTotal);
  const nestedTotal = computed(() => shares.value.nestedTotal);

  function parentOf(entry: SpaceEntry): SpaceEntry | null {
    return shares.value.parentOf(entry);
  }

  function share(entry: SpaceEntry): number {
    return shares.value.share(entry);
  }

  return {
    report,
    path,
    loading,
    error,
    sort,
    history,
    entries,
    totalSize,
    topLevel,
    topLevelTotal,
    nestedTotal,
    largest,
    canGoUp,
    parentOf,
    open,
    drill,
    up,
    overview,
    cancel,
    share,
  };
});
