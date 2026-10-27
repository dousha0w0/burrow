import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/lib/bridge";
import type { EngineInfo } from "@/types/mole";

export const useEngineStore = defineStore("engine", () => {
  const info = ref<EngineInfo | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      info.value = await api.engineInfo();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading.value = false;
    }
  }

  const version = computed(() => info.value?.version ?? "—");
  const isBundled = computed(() => info.value?.source === "bundled");

  return { info, loading, error, load, version, isBundled };
});
