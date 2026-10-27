import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api, onStatus } from "@/lib/bridge";
import { percentOf } from "@/lib/format";
import type { StatusSnapshot } from "@/types/mole";

export interface StatusSample {
  at: number;
  cpu: number;
  memory: number;
  read: number;
  write: number;
  rx: number;
  tx: number;
}

const SAMPLE_LIMIT = 90;

export const useStatusStore = defineStore("status", () => {
  const snapshot = ref<StatusSnapshot | null>(null);
  const samples = ref<StatusSample[]>([]);
  const watching = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let unlisten: (() => void) | null = null;
  let interval = 2;

  function apply(next: StatusSnapshot): void {
    // `--watch` snapshots start with empty hardware strings; keep the known
    // static facts from the first full collection.
    const previous = snapshot.value;
    if (previous && !next.hardware?.model) next.hardware = previous.hardware;
    if (previous && next.platform === "") next.platform = previous.platform;
    snapshot.value = next;
    samples.value = [
      ...samples.value,
      {
        at: Date.now(),
        cpu: next.cpu.usage,
        memory: next.memory.used_percent,
        read: next.disk_io.read_rate,
        write: next.disk_io.write_rate,
        rx: next.network[0]?.rx_rate_mbs ?? 0,
        tx: next.network[0]?.tx_rate_mbs ?? 0,
      },
    ].slice(-SAMPLE_LIMIT);
  }

  async function refreshOnce(): Promise<void> {
    loading.value = !snapshot.value;
    try {
      apply(await api.statusOnce());
      error.value = null;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading.value = false;
    }
  }

  async function start(seconds = interval): Promise<void> {
    interval = Math.min(10, Math.max(1, Math.round(seconds)));
    await stop();
    if (!snapshot.value) await refreshOnce();
    unlisten = await onStatus(apply);
    try {
      await api.statusWatchStart(interval);
      watching.value = true;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function stop(): Promise<void> {
    unlisten?.();
    unlisten = null;
    if (watching.value) {
      watching.value = false;
      await api.statusWatchStop().catch(() => {});
    }
  }

  async function restart(seconds: number): Promise<void> {
    await start(seconds);
  }

  const health = computed(() => snapshot.value?.health_score ?? 0);
  const healthLabel = computed(() => snapshot.value?.health_score_msg ?? "—");
  const primaryDisk = computed(() => snapshot.value?.disks.find((disk) => disk.mount === "/") ?? snapshot.value?.disks[0] ?? null);
  const diskPercent = computed(() => percentOf(primaryDisk.value?.used ?? 0, primaryDisk.value?.total ?? 0));
  const battery = computed(() => snapshot.value?.batteries[0] ?? null);
  const memoryPercent = computed(() => snapshot.value?.memory.used_percent ?? 0);
  const cpuPercent = computed(() => snapshot.value?.cpu.usage ?? 0);
  const network = computed(() => snapshot.value?.network.find((item) => item.ip) ?? snapshot.value?.network[0] ?? null);
  const processes = computed(() => snapshot.value?.top_processes.slice(0, 8) ?? []);

  return {
    snapshot,
    samples,
    watching,
    loading,
    error,
    refreshOnce,
    start,
    stop,
    restart,
    health,
    healthLabel,
    primaryDisk,
    diskPercent,
    battery,
    memoryPercent,
    cpuPercent,
    network,
    processes,
  };
});
