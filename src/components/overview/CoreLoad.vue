<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "@/components/ui/Icon.vue";
import type { StatusCpu } from "@/types/mole";

const props = defineProps<{ cpu: StatusCpu | null }>();

const { t } = useI18n();

interface CoreRow {
  index: number;
  title: string;
  value: number;
  fill: string;
}

const cores = computed<CoreRow[]>(() =>
  (props.cpu?.per_core ?? []).map((raw, index) => {
    const value = Math.min(100, Math.max(0, Number.isFinite(raw) ? raw : 0));
    return {
      index,
      title: `${t("overview.core")} ${index + 1}`,
      value,
      fill: value >= 85 ? "bg-destructive" : value >= 60 ? "bg-warning" : "bg-[var(--c1)]",
    };
  }),
);

const coreHint = computed(() => {
  const cpu = props.cpu;
  if (!cpu) return "";
  if (cpu.p_core_count > 0 || cpu.e_core_count > 0) return `${cpu.p_core_count}P · ${cpu.e_core_count}E`;
  const count = cpu.core_count || cpu.logical_cpu;
  return count > 0 ? `${count} ${t("overview.cores")}` : "";
});

function loadValue(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";
}
</script>

<template>
  <section class="panel flex min-w-0 flex-col">
    <div class="panel-head">
      <Icon name="cpu" :size="12" />
      <span>{{ t("overview.perCore") }}</span>
      <span v-if="coreHint" class="panel-hint">{{ coreHint }}</span>
      <span v-if="cpu?.per_core_estimated" class="badge ml-auto" data-tone="warning">
        {{ t("overview.perCoreEstimated") }}
      </span>
    </div>

    <div class="panel-body flex-1">
      <div v-if="cores.length" class="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div v-for="core in cores" :key="core.index" class="flex min-w-0 items-center gap-1.5" :title="core.title">
          <span class="mono w-[18px] shrink-0 text-[10px] leading-none text-muted-foreground">
            {{ String(core.index + 1).padStart(2, "0") }}
          </span>
          <div class="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full transition-[width] duration-500"
              :class="core.fill"
              :style="{ width: `${core.value}%` }"
            />
          </div>
          <span class="num w-[30px] shrink-0 text-right text-[10px] leading-none text-muted-foreground">
            {{ Math.round(core.value) }}%
          </span>
        </div>
      </div>
      <div v-else class="py-2 text-[11.5px] text-muted-foreground">{{ t("overview.noCores") }}</div>
    </div>

    <div class="panel-foot flex-wrap gap-x-3 gap-y-1">
      <span class="section-label">{{ t("overview.load") }}</span>
      <span class="num text-[11px]">
        <span class="text-muted-foreground">1m</span> {{ loadValue(cpu?.load1) }}
      </span>
      <span class="num text-[11px]">
        <span class="text-muted-foreground">5m</span> {{ loadValue(cpu?.load5) }}
      </span>
      <span class="num text-[11px]">
        <span class="text-muted-foreground">15m</span> {{ loadValue(cpu?.load15) }}
      </span>
    </div>
  </section>
</template>
