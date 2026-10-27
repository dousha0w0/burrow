import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/lib/bridge";
import type { HistoryReport, HistorySession } from "@/types/mole";

export const useHistoryStore = defineStore("history", () => {
  const report = ref<HistoryReport | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const limit = ref(80);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      report.value = await api.history(limit.value);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading.value = false;
    }
  }

  const sessions = computed<HistorySession[]>(() => report.value?.sessions ?? []);

  /** Total reclaimed size in GB, summed from the engine's human sizes. */
  const reclaimed = computed(() => {
    const parse = (size: string): number => {
      const match = /^([\d.]+)\s*([KMGT]?)B$/i.exec(size.trim());
      if (!match) return 0;
      const value = Number.parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const factor = unit === "K" ? 1 / 1024 ** 2 : unit === "M" ? 1 / 1024 : unit === "G" ? 1 : unit === "T" ? 1024 : 1;
      return value * factor;
    };
    return sessions.value
      .filter((session) => !session.command.includes("dry-run"))
      .reduce((sum, session) => sum + parse(session.size), 0);
  });

  const destructive = computed(() => sessions.value.filter((session) => !session.command.includes("dry-run")));

  return { report, loading, error, limit, sessions, reclaimed, destructive, load };
});
