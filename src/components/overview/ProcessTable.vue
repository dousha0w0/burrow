<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatBytes, formatPercent } from "@/lib/format";
import type { StatusProcess } from "@/types/mole";

const props = defineProps<{ processes: StatusProcess[] }>();

const { t } = useI18n();

const rows = computed(() => [...props.processes].sort((a, b) => b.cpu - a.cpu).slice(0, 8));

function memoryOf(row: StatusProcess): string {
  if (row.memory_bytes > 0) return formatBytes(row.memory_bytes);
  if (row.memory > 0) return formatBytes(row.memory * 1024 ** 3);
  return "—";
}

function cpuTone(value: number): string {
  if (value >= 80) return "text-destructive";
  if (value >= 35) return "text-warning";
  return "";
}
</script>

<template>
  <div class="file-table">
    <div class="file-table__head">
      <div class="file-table__head-cell flex-1">{{ t("overview.processColumn") }}</div>
      <div class="file-table__head-cell w-[64px] justify-end">{{ t("overview.pid") }}</div>
      <div class="file-table__head-cell w-[62px] justify-end">{{ t("overview.cpuColumn") }}</div>
      <div class="file-table__head-cell w-[84px] justify-end">{{ t("overview.memoryColumn") }}</div>
    </div>

    <div v-for="row in rows" :key="`${row.pid}-${row.name}`" class="file-table__row" :title="row.command || row.name">
      <div class="file-table__cell flex-1 min-w-0">
        <span class="file-table__name truncate">{{ row.name }}</span>
      </div>
      <div class="file-table__cell file-table__cell--num mono w-[64px]">{{ row.pid }}</div>
      <div class="file-table__cell file-table__cell--num w-[62px]">
        <span class="num" :class="cpuTone(row.cpu)">{{ formatPercent(row.cpu, 1) }}</span>
      </div>
      <div class="file-table__cell file-table__cell--num w-[84px]">{{ memoryOf(row) }}</div>
    </div>

    <div v-if="!rows.length" class="empty-state">
      <span>{{ t("overview.noProcesses") }}</span>
    </div>
  </div>
</template>
