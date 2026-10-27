<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PreviewSections from "@/components/clean/PreviewSections.vue";
import RunLog from "@/components/clean/RunLog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import Segmented from "@/components/ui/Segmented.vue";
import { api } from "@/lib/bridge";
import { formatDuration, formatEngineSize } from "@/lib/format";
import { useRunsStore } from "@/stores/runs";
import { useUiStore } from "@/stores/ui";
import type { RunKind, RunState } from "@/types/mole";

const { t } = useI18n();
const runs = useRunsStore();
const ui = useUiStore();

const kind = ref<RunKind>("clean");
const selectedId = ref<string | null>(null);
const confirmOpen = ref(false);
const logTouched = ref(false);
const logOpen = ref(false);
const now = ref(Date.now());

let clock = 0;

const kindOptions = computed(() => [
  { value: "clean", label: t("clean.diskTab") },
  { value: "purge", label: t("clean.projectTab") },
]);

const busy = computed(() => runs.active !== null);
const activeRun = computed(() => runs.active);
const stopId = computed(() =>
  activeRun.value && activeRun.value.kind === kind.value ? activeRun.value.id : null,
);

const selectedRun = computed(() => {
  const id = selectedId.value;
  return id ? runs.runs.find((run) => run.id === id) ?? null : null;
});

const latestPreview = computed(
  () => runs.runs.find((run) => run.kind === kind.value && run.preview) ?? null,
);

/** The preview pane follows the clicked run when that run is a preview. */
const previewRun = computed(() => {
  const selected = selectedRun.value;
  if (selected && selected.kind === kind.value && selected.preview) return selected;
  return latestPreview.value;
});

const previewLines = computed(() => (previewRun.value?.lines ?? []).map((line) => line.text));
const previewRunning = computed(() => previewRun.value?.status === "running");

/** Hero number: newest preview for the kind that actually produced a size. */
const heroPreview = computed(() => {
  const current = previewRun.value;
  if (current?.summary?.size) return current;
  return runs.runs.find((run) => run.kind === kind.value && run.preview && run.summary?.size) ?? null;
});

const heroSize = computed(() => formatEngineSize(heroPreview.value?.summary?.size));

const heroMeta = computed(() => {
  const summary = heroPreview.value?.summary;
  if (!summary) return "";
  const parts: string[] = [];
  if (summary.items !== null) parts.push(t("clean.items", { n: summary.items }));
  if (summary.categories !== null) parts.push(t("clean.categories", { n: summary.categories }));
  return parts.join(" · ");
});

const realRun = computed(
  () =>
    runs.runs.find((run) => run.kind === kind.value && !run.preview && run.status !== "running") ?? null,
);

const realNotes = computed(() => {
  const run = realRun.value;
  if (!run) return [];
  return [...(run.summary?.notes ?? []), ...(run.error ? [run.error] : [])];
});

const logRun = computed(() => selectedRun.value ?? runs.latestFor(kind.value));
const logVisible = computed(() => (logTouched.value ? logOpen.value : logRun.value !== null));

function setKind(value: string): void {
  if (value !== "clean" && value !== "purge") return;
  kind.value = value;
  selectedId.value = null;
}

function selectRun(run: RunState): void {
  kind.value = run.kind;
  selectedId.value = run.id;
}

function toggleLog(): void {
  logOpen.value = !logVisible.value;
  logTouched.value = true;
}

function clearRuns(): void {
  const wasVisible = logVisible.value;
  runs.clear();
  selectedId.value = null;
  logTouched.value = true;
  logOpen.value = wasVisible;
}

function noteText(note: string): string {
  if (note === "system-skipped") return t("clean.systemSkipped");
  if (note === "already-clean") return t("clean.alreadyClean");
  return note;
}

function statusLabel(run: RunState): string {
  switch (run.status) {
    case "running":
      return run.preview ? t("clean.previewing") : t("clean.running");
    case "failed":
      return t("clean.failed");
    case "cancelled":
      return t("clean.cancelled");
    default:
      return t("common.done");
  }
}

function statusTone(run: RunState): "accent" | "success" | undefined {
  if (run.status === "running") return "accent";
  if (run.status === "succeeded") return "success";
  return undefined;
}

const STATUS_TEXT: Record<RunState["status"], string> = {
  running: "text-warning",
  succeeded: "text-success",
  failed: "text-destructive",
  cancelled: "text-muted-foreground",
};

function statusTextClass(run: RunState): string {
  return STATUS_TEXT[run.status];
}

function kindLabel(value: RunKind): string {
  return value === "clean" ? t("clean.diskTab") : t("clean.projectTab");
}

function runDuration(run: RunState): string {
  const end = run.endedAt ?? (run.status === "running" ? now.value : null);
  if (!end) return "—";
  return formatDuration(end - run.startedAt);
}

function relativeTime(at: number): string {
  const diff = Math.max(0, now.value - at);
  if (diff < 45_000) return t("clean.justNow");
  if (diff < 3_600_000) return t("clean.minutesAgo", { n: Math.max(1, Math.round(diff / 60_000)) });
  if (diff < 86_400_000) return t("clean.hoursAgo", { n: Math.max(1, Math.round(diff / 3_600_000)) });
  return new Date(at).toLocaleString();
}

function report(error: unknown): void {
  ui.toast(error instanceof Error ? error.message : String(error), "error");
}

async function launch(preview: boolean): Promise<void> {
  confirmOpen.value = false;
  if (busy.value) return;
  try {
    const id = await runs.start(kind.value, preview);
    selectedId.value = id;
  } catch (error) {
    report(error);
  }
}

function stopRun(): void {
  const id = stopId.value;
  if (!id) return;
  void runs.cancel(id).catch(report);
}

async function openTerminal(): Promise<void> {
  try {
    await api.terminalRun(kind.value);
  } catch (error) {
    report(error);
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && confirmOpen.value) confirmOpen.value = false;
}

watch(
  () => ui.refreshTick,
  () => (now.value = Date.now()),
);

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  clock = window.setInterval(() => (now.value = Date.now()), 30_000);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.clearInterval(clock);
});
</script>

<template>
  <div class="view">
    <header class="view-head">
      <div class="flex min-w-0 flex-col">
        <span class="view-title">{{ $t("clean.title") }}</span>
        <span class="view-subtitle truncate">{{ $t("clean.subtitle") }}</span>
      </div>
      <div class="flex-1" />

      <Segmented compact :model-value="kind" :options="kindOptions" @update:model-value="setKind" />

      <AppButton variant="ghost" size="sm" icon="terminal" @click="openTerminal">
        {{ $t("clean.terminal") }}
      </AppButton>
      <AppButton variant="ghost" size="sm" :icon="logVisible ? 'chevron-down' : 'list'" @click="toggleLog">
        {{ logVisible ? $t("clean.hideLog") : $t("clean.showLog") }}
      </AppButton>
    </header>

    <div class="view-scroll scroll-thin">
      <div class="view-grid">
        <section class="panel">
          <header class="panel-head">
            <Icon name="broom" :size="13" />
            <span>{{ kind === "clean" ? $t("clean.diskTab") : $t("clean.projectTab") }}</span>
            <span class="panel-hint truncate">{{ kind === "clean" ? $t("clean.diskHint") : $t("clean.projectHint") }}</span>
            <div class="flex-1" />
            <span v-if="activeRun" class="badge shrink-0" data-tone="accent">
              <Icon name="spinner" :size="10" class="spin" />
              {{ activeRun.preview ? $t("clean.previewing") : $t("clean.running") }}
            </span>
          </header>

          <div class="panel-body flex flex-wrap items-center gap-x-6 gap-y-3">
            <div class="min-w-0 flex-1">
              <div class="section-label">{{ $t("clean.potential") }}</div>
              <div class="mt-1 flex items-baseline gap-2">
                <span class="num text-[32px] font-semibold leading-none tracking-tight">{{ heroSize }}</span>
                <span v-if="heroPreview" class="badge" data-tone="accent">{{ $t("clean.dryRun") }}</span>
              </div>
              <div v-if="heroMeta" class="num mt-1.5 text-[11.5px] text-muted-foreground">{{ heroMeta }}</div>
              <div class="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <Icon name="info" :size="11" class="mt-[2px]" />
                <span>{{ $t("clean.previewHint") }}</span>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <AppButton variant="secondary" size="md" icon="eye" :disabled="busy" @click="launch(true)">
                {{ $t("clean.preview") }}
              </AppButton>
              <AppButton v-if="stopId" variant="secondary" size="md" icon="stop" @click="stopRun">
                {{ $t("clean.stop") }}
              </AppButton>
              <AppButton v-else variant="primary" size="md" icon="play" :disabled="busy" @click="confirmOpen = true">
                {{ kind === "clean" ? $t("clean.run") : $t("clean.runPurge") }}
              </AppButton>
            </div>
          </div>

          <div v-if="realRun" class="panel-foot flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
            <span class="flex items-center gap-1.5" :class="statusTextClass(realRun)">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              <span>{{ statusLabel(realRun) }}</span>
            </span>
            <span v-if="realRun.summary?.size" class="flex items-center gap-1">
              <span class="muted">{{ $t("clean.freed") }}</span>
              <span class="num font-semibold">{{ formatEngineSize(realRun.summary?.size) }}</span>
            </span>
            <span v-if="realRun.summary?.items" class="muted num">{{ $t("clean.items", { n: realRun.summary?.items }) }}</span>
            <span v-if="realRun.code !== null" class="muted mono">{{ $t("clean.exitCode", { code: realRun.code }) }}</span>
            <span
              v-for="note in realNotes"
              :key="note"
              class="muted"
              :class="note === realRun.error ? 'text-destructive' : ''"
            >{{ noteText(note) }}</span>
          </div>
        </section>

        <PreviewSections :lines="previewLines" :kind="kind" :running="previewRunning" />

        <RunLog v-if="logVisible" :run="logRun" @clear="clearRuns" />

        <section class="panel">
          <header class="panel-head">
            <Icon name="clock" :size="13" />
            <span>{{ $t("clean.lastRuns") }}</span>
            <span class="panel-hint num">{{ runs.runs.length }}</span>
            <div class="flex-1" />
            <AppButton v-if="runs.runs.length" variant="ghost" size="xs" icon="trash" @click="clearRuns">
              {{ $t("clean.clearLog") }}
            </AppButton>
          </header>

          <div v-if="!runs.runs.length" class="empty-state py-6">
            <strong>{{ $t("clean.noRuns") }}</strong>
            <span>{{ $t("clean.previewFirst") }}</span>
          </div>

          <div v-else class="file-table__viewport scroll-thin max-h-[232px]">
            <div
              v-for="run in runs.runs"
              :key="run.id"
              class="file-table__row"
              role="button"
              tabindex="0"
              :data-selected="selectedId === run.id"
              @click="selectRun(run)"
              @keydown.enter.prevent="selectRun(run)"
              @keydown.space.prevent="selectRun(run)"
            >
              <div class="file-table__cell w-[104px]">{{ kindLabel(run.kind) }}</div>
              <div class="file-table__cell w-[92px]">
                <span class="badge" :data-tone="run.preview ? undefined : 'accent'">{{ run.preview ? $t("clean.dryRun") : $t("clean.realRun") }}</span>
              </div>
              <div class="file-table__cell w-[104px]">
                <span class="badge" :data-tone="statusTone(run)" :class="run.status === 'failed' ? 'text-destructive' : ''">{{ statusLabel(run) }}</span>
              </div>
              <div class="file-table__cell file-table__cell--num w-[96px]">{{ formatEngineSize(run.summary?.size) }}</div>
              <div class="file-table__cell file-table__cell--num w-[80px]">{{ runDuration(run) }}</div>
              <div class="file-table__cell file-table__cell--muted ml-auto">{{ relativeTime(run.startedAt) }}</div>
            </div>
          </div>
        </section>

        <div class="flex items-start gap-1.5 px-1 pb-1 text-[11px] leading-relaxed text-muted-foreground">
          <Icon name="info" :size="12" class="mt-[1px]" />
          <span>{{ $t("clean.adminNote") }}</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="confirmOpen" class="modal-backdrop fade-in" @click.self="confirmOpen = false">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-label="$t('clean.confirmTitle')">
          <div class="modal-head">
            <Icon name="alert" :size="14" class="text-warning" />
            <span>{{ $t("clean.confirmTitle") }}</span>
            <div class="flex-1" />
            <AppButton size="icon-sm" variant="ghost" icon="x" :title="$t('common.close')" @click="confirmOpen = false" />
          </div>
          <div class="modal-body">
            <p class="text-[12.5px] leading-relaxed">{{ $t("clean.confirmBody") }}</p>
            <div v-if="heroPreview" class="mt-3 flex items-center gap-2 rounded-[6px] border border-border bg-muted px-2.5 py-2">
              <span class="section-label">{{ $t("clean.potential") }}</span>
              <span class="num text-[13px] font-semibold">{{ heroSize }}</span>
              <span v-if="heroMeta" class="num ml-auto text-[11px] text-muted-foreground">{{ heroMeta }}</span>
            </div>
            <p v-else class="mt-2 text-[11px] text-muted-foreground">{{ $t("clean.previewFirst") }}</p>
          </div>
          <div class="modal-foot">
            <AppButton size="md" variant="secondary" @click="confirmOpen = false">{{ $t("common.cancel") }}</AppButton>
            <AppButton size="md" variant="danger" icon="broom" @click="launch(false)">{{ $t("clean.confirmRun") }}</AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
