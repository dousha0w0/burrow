<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import CoreLoad from "@/components/overview/CoreLoad.vue";
import ProcessTable from "@/components/overview/ProcessTable.vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import MeterRing from "@/components/ui/MeterRing.vue";
import MetricCard from "@/components/ui/MetricCard.vue";
import Sparkline from "@/components/ui/Sparkline.vue";
import { formatBytes, formatPercent, formatRate, formatUptime } from "@/lib/format";
import { useStatusStore, type StatusSample } from "@/stores/status";
import { useUiStore } from "@/stores/ui";
import type { StatusBattery } from "@/types/mole";

type Tone = "accent" | "success" | "warning" | "destructive" | "muted";

interface FactRow {
  label: string;
  value: string;
}

interface FactGroup {
  key: string;
  label: string;
  rows: FactRow[];
}

const { t } = useI18n();
const status = useStatusStore();
const ui = useUiStore();

const snapshot = computed(() => status.snapshot);
const memory = computed(() => snapshot.value?.memory ?? null);
const disk = computed(() => status.primaryDisk);
const latest = computed(() => status.samples.at(-1) ?? null);

function seriesOf(pick: (sample: StatusSample) => number): number[] {
  return status.samples.map((sample) => {
    const value = pick(sample);
    return Number.isFinite(value) ? value : 0;
  });
}

const cpuSeries = computed(() => seriesOf((sample) => sample.cpu));
const memorySeries = computed(() => seriesOf((sample) => sample.memory));
const diskSeries = computed(() => seriesOf((sample) => sample.read));
/** KB/s keeps idle networks from collapsing into the baseline. */
const networkSeries = computed(() => seriesOf((sample) => sample.rx * 1024));

const zombies = computed(() => {
  const value = snapshot.value?.zombie_count ?? 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
});
const stale = computed(() => snapshot.value?.process_stale === true);

const uptime = computed(() => {
  const snap = snapshot.value;
  if (!snap) return "—";
  return snap.uptime || formatUptime(snap.uptime_seconds);
});

const procs = computed(() => {
  const value = snapshot.value?.procs;
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "—";
});

const load1 = computed(() => {
  const load = snapshot.value?.cpu.load1;
  return typeof load === "number" && Number.isFinite(load) ? load.toFixed(2) : "—";
});

/** `22/32 GB` — joins two byte values without repeating the unit. */
function pair(used: number, total: number): string {
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return "—";
  const left = formatBytes(used, 0);
  const right = formatBytes(total, 0);
  const [leftValue, leftUnit] = left.split(" ");
  const [rightValue, rightUnit] = right.split(" ");
  if (leftUnit === rightUnit) return `${leftValue}/${rightValue} ${leftUnit}`;
  return `${left} / ${right}`;
}

const memoryPair = computed(() => (memory.value ? pair(memory.value.used, memory.value.total) : "—"));
const memorySwap = computed(() => (memory.value ? formatBytes(memory.value.swap_used) : "—"));
const diskPair = computed(() => (disk.value ? pair(disk.value.used, disk.value.total) : "—"));
const diskFree = computed(() => (disk.value ? formatBytes(Math.max(0, disk.value.total - disk.value.used)) : "—"));

const downRate = computed(() => latest.value?.rx ?? status.network?.rx_rate_mbs ?? 0);
const upRate = computed(() => latest.value?.tx ?? status.network?.tx_rate_mbs ?? 0);

function tone(value: number, warning: number, critical: number): Tone {
  if (!Number.isFinite(value)) return "muted";
  if (value >= critical) return "destructive";
  if (value >= warning) return "warning";
  return "accent";
}

const cpuTone = computed(() => tone(status.cpuPercent, 70, 90));
const memoryTone = computed(() => tone(status.memoryPercent, 75, 90));
const diskTone = computed(() => tone(status.diskPercent, 80, 92));

function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

const cpuPercent = computed(() => clampPercent(status.cpuPercent));
const memoryPercent = computed(() => clampPercent(status.memoryPercent));
const diskPercent = computed(() => clampPercent(status.diskPercent));

function batteryStatus(battery: StatusBattery): string {
  const raw = battery.status.toLowerCase();
  if (raw.includes("discharg")) return t("overview.discharging");
  if (raw.includes("charg")) return t("overview.charging");
  return battery.status || "—";
}

const groups = computed<FactGroup[]>(() => {
  const snap = snapshot.value;
  const thermal = snap?.thermal;

  const thermalRows: FactRow[] = [];
  if (thermal) {
    thermalRows.push({
      label: thermal.fan_count > 1 ? `${t("overview.fan")} ×${thermal.fan_count}` : t("overview.fan"),
      value: thermal.fan_speed > 0 ? `${Math.round(thermal.fan_speed)} rpm` : "—",
    });
    thermalRows.push({
      label: t("overview.cpuTemp"),
      value: thermal.cpu_temp > 0 ? `${thermal.cpu_temp.toFixed(0)} °C` : "—",
    });
    if (thermal.gpu_temp > 0) {
      thermalRows.push({ label: t("overview.gpuTemp"), value: `${thermal.gpu_temp.toFixed(0)} °C` });
    }
    thermalRows.push({
      label: t("overview.batteryTemp"),
      value: thermal.battery_temp > 0 ? `${thermal.battery_temp.toFixed(1)} °C` : "—",
    });
  }

  const iface = status.network;
  const networkRows: FactRow[] = [
    {
      label: t("overview.network"),
      value: iface ? [iface.name, iface.ip].filter(Boolean).join(" · ") : "—",
    },
    { label: t("overview.down"), value: formatRate(downRate.value) },
    { label: t("overview.up"), value: formatRate(upRate.value) },
  ];
  const proxy = snap?.proxy;
  networkRows.push({
    label: t("overview.proxy"),
    value: proxy?.enabled
      ? [proxy.type, proxy.host].filter(Boolean).join(" · ") || "—"
      : t("overview.off"),
  });

  const battery = status.battery;
  const batteryRows: FactRow[] = battery
    ? [
        {
          label: t("overview.battery"),
          value: `${Math.round(Number.isFinite(battery.percent) ? battery.percent : 0)}% · ${batteryStatus(battery)}`,
        },
        {
          label: t("overview.cycles"),
          value: Number.isFinite(battery.cycle_count) ? String(battery.cycle_count) : "—",
        },
        {
          label: t("overview.capacity"),
          value: Number.isFinite(battery.capacity) && battery.capacity > 0 ? `${Math.round(battery.capacity)}%` : "—",
        },
      ]
    : [{ label: t("overview.battery"), value: t("overview.noBattery") }];

  return [
    { key: "thermal", label: t("overview.thermal"), rows: thermalRows },
    { key: "network", label: t("overview.network"), rows: networkRows },
    { key: "battery", label: t("overview.battery"), rows: batteryRows },
  ].filter((group) => group.rows.length > 0);
});

function retry(): void {
  void status.refreshOnce();
}

watch(
  () => ui.refreshTick,
  () => void status.refreshOnce(),
);
</script>

<template>
  <div class="view">
    <header class="view-head">
      <div class="flex min-w-0 flex-col">
        <span class="view-title">{{ $t("overview.title") }}</span>
        <span class="view-subtitle truncate">{{ $t("overview.subtitle") }}</span>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1.5">
        <span v-if="status.watching" class="badge" data-tone="success">
          <Icon name="spinner" :size="10" class="spin" />
          {{ $t("overview.live") }}
        </span>
        <span v-else-if="snapshot" class="badge">
          <Icon name="stop" :size="10" />
          {{ $t("overview.paused") }}
        </span>
        <AppButton variant="ghost" icon="broom" @click="ui.setView('clean')">
          {{ $t("overview.quickClean") }}
        </AppButton>
        <AppButton variant="ghost" icon="hard-drive" @click="ui.setView('space')">
          {{ $t("overview.analyzeDisk") }}
        </AppButton>
      </div>
    </header>

    <div class="view-scroll scroll-thin">
      <div v-if="!snapshot" class="empty-state">
        <template v-if="status.loading || !status.error">
          <Icon name="spinner" :size="18" class="spin" />
          <span>{{ $t("common.loading") }}</span>
        </template>
        <template v-else>
          <Icon name="alert" :size="18" class="text-destructive" />
          <strong>{{ $t("overview.errorTitle") }}</strong>
          <span class="max-w-[460px] break-words">{{ status.error }}</span>
          <AppButton size="xs" icon="refresh" @click="retry">{{ $t("common.retry") }}</AppButton>
        </template>
      </div>

      <template v-else>
        <div
          v-if="status.error"
          class="mb-3 flex items-center gap-2 rounded-[var(--dr-lg)] border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-[11.5px] text-destructive"
        >
          <Icon name="alert" :size="12" />
          <span class="min-w-0 flex-1 truncate" :title="status.error">
            {{ $t("overview.errorTitle") }} · {{ status.error }}
          </span>
          <AppButton size="xs" @click="retry">{{ $t("common.retry") }}</AppButton>
        </div>

        <div class="view-grid view-grid--metrics">
          <section class="panel flex min-w-0 flex-col">
            <div class="panel-head">
              <Icon name="shield" :size="12" />
              <span>{{ $t("overview.health") }}</span>
              <span class="panel-hint ml-auto min-w-0 truncate">{{ snapshot?.hardware?.model }}</span>
            </div>
            <div class="panel-body flex flex-1 flex-col gap-2">
              <div class="flex items-center gap-3">
                <MeterRing :value="status.health" :label="status.healthLabel" :size="72" :stroke="6" />
                <div class="flex min-w-0 flex-1 flex-col gap-1.5 text-[11px]">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="text-muted-foreground">{{ $t("status.uptime") }}</span>
                    <span class="num truncate text-[12px]">{{ uptime }}</span>
                  </div>
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="text-muted-foreground">{{ $t("status.processes") }}</span>
                    <span class="num truncate text-[12px]">{{ procs }}</span>
                  </div>
                </div>
              </div>
              <p class="text-[11px] leading-snug text-muted-foreground">{{ $t("overview.healthHint") }}</p>
            </div>
          </section>

          <MetricCard
            class="flex flex-col"
            icon="cpu"
            :label="$t('status.cpu')"
            :value="formatPercent(status.cpuPercent)"
            :sub="`${$t('overview.load')} ${load1}`"
            :percent="cpuPercent"
            :tone="cpuTone"
          >
            <div class="mt-auto pt-3">
              <Sparkline :values="cpuSeries" :max="100" :height="52" :capacity="48" :tone="cpuTone" />
            </div>
          </MetricCard>

          <MetricCard
            class="flex flex-col"
            icon="memory"
            :label="$t('status.memory')"
            :value="memoryPair"
            :sub="`${$t('overview.swap')} ${memorySwap}`"
            :percent="memoryPercent"
            :tone="memoryTone"
          >
            <div class="mt-auto pt-3">
              <Sparkline :values="memorySeries" :max="100" :height="52" :capacity="48" :tone="memoryTone" />
            </div>
          </MetricCard>

          <MetricCard
            class="flex flex-col"
            icon="hard-drive"
            :label="$t('status.disk')"
            :value="diskPair"
            :sub="`${$t('overview.free')} ${diskFree}`"
            :percent="diskPercent"
            :tone="diskTone"
          >
            <div class="mt-auto pt-3" :title="$t('overview.diskActivity')">
              <Sparkline :values="diskSeries" :height="52" :capacity="48" />
            </div>
          </MetricCard>

          <MetricCard
            class="flex flex-col"
            icon="wifi"
            :label="$t('overview.network')"
            :value="formatRate(downRate)"
            :sub="`${$t('overview.up')} ${formatRate(upRate)}`"
            tone="accent"
          >
            <div class="mt-auto pt-3">
              <Sparkline :values="networkSeries" :height="52" :capacity="48" />
            </div>
          </MetricCard>
        </div>

        <div class="view-grid view-grid--split mt-3">
          <section class="panel flex min-w-0 flex-col">
            <div class="panel-head">
              <Icon name="list" :size="12" />
              <span>{{ $t("overview.topProcesses") }}</span>
              <span class="panel-hint min-w-0 truncate">{{ $t("overview.topByCpu") }}</span>
              <div class="ml-auto flex items-center gap-1.5">
                <span v-if="stale" class="badge" data-tone="warning">{{ $t("overview.stale") }}</span>
                <span v-if="zombies > 0" class="badge" data-tone="warning">
                  {{ $t("overview.zombies", { n: zombies }, zombies) }}
                </span>
              </div>
            </div>
            <ProcessTable :processes="status.processes" />
            <div class="panel-foot">
              <span class="section-label">{{ $t("status.processes") }}</span>
              <span class="num">{{ procs }}</span>
              <span class="ml-auto min-w-0 truncate text-[11px] text-muted-foreground">{{ snapshot?.hardware?.cpu_model }}</span>
            </div>
          </section>

          <div class="flex min-w-0 flex-col gap-3">
            <CoreLoad :cpu="snapshot?.cpu ?? null" />

            <section class="panel">
              <div class="panel-head">
                <Icon name="thermometer" :size="12" />
                <span>{{ $t("overview.environment") }}</span>
              </div>
              <div class="panel-body flex flex-col gap-2.5">
                <div v-for="group in groups" :key="group.key" class="flex flex-col gap-1">
                  <div class="section-label">{{ group.label }}</div>
                  <div
                    v-for="row in group.rows"
                    :key="`${group.key}-${row.label}`"
                    class="flex items-baseline justify-between gap-3 text-[11.5px]"
                  >
                    <span class="shrink-0 text-muted-foreground">{{ row.label }}</span>
                    <span class="num min-w-0 truncate text-right" :title="row.value">{{ row.value }}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
