<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/ui/Icon.vue";
import { IS_MOCK } from "@/lib/bridge";
import { formatBytes, formatPercent, formatRate } from "@/lib/format";
import { useEngineStore } from "@/stores/engine";
import { useStatusStore } from "@/stores/status";

const status = useStatusStore();
const engine = useEngineStore();

const healthTone = computed(() => {
  if (!status.snapshot) return "muted";
  if (status.health >= 80) return "success";
  if (status.health >= 55) return "warning";
  return "destructive";
});

const swap = computed(() => {
  const memory = status.snapshot?.memory;
  return memory ? formatBytes(memory.swap_used) : "—";
});
</script>

<template>
  <footer class="flex h-[26px] shrink-0 items-center gap-3 border-t border-border bg-chrome px-3 text-[10.5px] text-muted-foreground" data-testid="status-bar">
    <span class="flex items-center gap-1.5">
      <span
        class="inline-block h-1.5 w-1.5 rounded-full"
        :style="{ background: `var(--${healthTone === 'muted' ? 'muted-foreground' : healthTone})` }"
      />
      <span>{{ $t("status.health") }} {{ status.snapshot ? Math.round(status.health) : "—" }}</span>
    </span>
    <span class="flex items-center gap-1">
      <Icon name="cpu" :size="10" />
      {{ formatPercent(status.cpuPercent) }}
    </span>
    <span class="flex items-center gap-1">
      <Icon name="memory" :size="10" />
      {{ formatPercent(status.memoryPercent) }}
      <span class="opacity-70">· swap {{ swap }}</span>
    </span>
    <span class="flex items-center gap-1">
      <Icon name="hard-drive" :size="10" />
      {{ status.primaryDisk ? formatBytes(status.primaryDisk.used) : "—" }}
      <span class="opacity-70">/ {{ status.primaryDisk ? formatBytes(status.primaryDisk.total) : "—" }}</span>
    </span>
    <span class="hidden items-center gap-1 xl:flex">
      <Icon name="arrow-down" :size="10" />
      {{ formatRate(status.samples.at(-1)?.rx) }}
      <Icon name="arrow-up" :size="10" class="ml-1" />
      {{ formatRate(status.samples.at(-1)?.tx) }}
    </span>
    <span v-if="status.error" class="truncate text-destructive" :title="status.error">{{ status.error }}</span>
    <div class="flex-1" />
    <span v-if="IS_MOCK" class="badge" data-tone="warning">{{ $t("status.mock") }}</span>
    <span>{{ $t("status.uptime") }} {{ status.snapshot?.uptime ?? "—" }}</span>
    <span class="text-muted-foreground/60">Mole {{ engine.version }}</span>
  </footer>
</template>
