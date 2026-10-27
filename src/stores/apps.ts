import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/lib/bridge";
import type { AppEntry } from "@/types/mole";

export const useAppsStore = defineStore("apps", () => {
  const entries = ref<AppEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const query = ref("");

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      entries.value = await api.appsList();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading.value = false;
    }
  }

  const filtered = computed(() => {
    const term = query.value.trim().toLowerCase();
    const list = term
      ? entries.value.filter((entry) => entry.name.toLowerCase().includes(term) || entry.bundle_id.toLowerCase().includes(term))
      : entries.value;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  });

  const homebrew = computed(() => entries.value.filter((entry) => entry.source === "Homebrew").length);

  return { entries, filtered, loading, error, query, homebrew, load };
});
