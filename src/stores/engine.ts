import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/lib/bridge";
import type { EngineInfo } from "@/types/mole";
import type { EnvironmentReport, UpdateReport } from "@/types/diagnostics";

export const useEngineStore = defineStore("engine", () => {
  const info = ref<EngineInfo | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const environment = ref<EnvironmentReport | null>(null);
  const environmentLoading = ref(false);
  const environmentError = ref<string | null>(null);

  const updates = ref<UpdateReport | null>(null);
  const updatesLoading = ref(false);
  const updatesError = ref<string | null>(null);

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

  /** Engine files, install shape and TCC reachability — cheap enough for boot. */
  async function loadEnvironment(): Promise<void> {
    environmentLoading.value = true;
    environmentError.value = null;
    try {
      environment.value = await api.environmentReport();
    } catch (cause) {
      environmentError.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      environmentLoading.value = false;
    }
  }

  /** Network round-trip to GitHub; only on demand or from Settings. */
  async function checkUpdates(): Promise<void> {
    updatesLoading.value = true;
    updatesError.value = null;
    try {
      updates.value = await api.checkUpdates();
    } catch (cause) {
      updatesError.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      updatesLoading.value = false;
    }
  }

  const version = computed(() => info.value?.version ?? "—");
  const isBundled = computed(() => info.value?.source === "bundled");
  const healthy = computed(() => environment.value?.engine.ok ?? true);
  const fullDiskAccess = computed(() => environment.value?.permissions.fullDiskAccess ?? false);

  return {
    info,
    loading,
    error,
    environment,
    environmentLoading,
    environmentError,
    updates,
    updatesLoading,
    updatesError,
    load,
    loadEnvironment,
    checkUpdates,
    version,
    isBundled,
    healthy,
    fullDiskAccess,
  };
});
