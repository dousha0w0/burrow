<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { useResizeHandle } from "@/composables/useResizeHandle";
import { formatDuration } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import type { RunState } from "@/types/mole";

const props = defineProps<{ run: RunState | null }>();
const emit = defineEmits<{ clear: [] }>();

const { t } = useI18n();
const ui = useUiStore();

const liveHeight = ref(ui.prefs.logHeight);
const viewport = ref<HTMLElement | null>(null);
const stick = ref(true);

const resize = useResizeHandle({
  axis: "y",
  direction: -1,
  current: () => liveHeight.value,
  min: 120,
  max: () => Math.min(420, Math.round(window.innerHeight * 0.6)),
  onChange: (value) => (liveHeight.value = value),
  onCommit: (value) => ui.setPrefs({ logHeight: value }),
});

watch(() => ui.prefs.logHeight, (value) => (liveHeight.value = value));

const lines = computed(() => (props.run ? props.run.lines : []));
const hasLines = computed(() => lines.value.length > 0);

const duration = computed(() => {
  const run = props.run;
  if (!run || !run.endedAt) return null;
  return formatDuration(run.endedAt - run.startedAt);
});

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

const statusTone = computed(() => {
  if (!props.run) return undefined;
  if (props.run.status === "running") return "accent";
  if (props.run.status === "succeeded") return "success";
  return undefined;
});

function scrollToBottom(): void {
  const el = viewport.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function onScroll(): void {
  const el = viewport.value;
  if (!el) return;
  stick.value = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
}

watch(
  () => props.run?.lines.length ?? 0,
  async () => {
    if (!stick.value) return;
    await nextTick();
    scrollToBottom();
  },
);

watch(
  () => props.run?.id,
  async () => {
    stick.value = true;
    await nextTick();
    scrollToBottom();
  },
);

onMounted(async () => {
  await nextTick();
  scrollToBottom();
});

async function copyLog(): Promise<void> {
  if (!props.run) return;
  const text = props.run.lines.map((line) => line.text).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    ui.toast(t("common.copied"), "success");
  } catch {
    ui.toast(t("clean.copyFailed"), "error");
  }
}
</script>

<template>
  <div class="relative" :style="{ height: `${liveHeight}px` }">
    <section class="panel flex h-full flex-col">
      <header class="panel-head shrink-0">
        <Icon name="terminal" :size="13" />
        <span class="shrink-0">{{ $t("clean.log") }}</span>
        <span
          v-if="run"
          class="badge shrink-0"
          :data-tone="statusTone"
          :class="run?.status === 'failed' ? 'text-destructive' : ''"
        >{{ statusLabel(run) }}</span>
        <span v-if="run && run.code !== null" class="mono shrink-0 text-[11px] text-muted-foreground">
          {{ $t("clean.exitCode", { code: run.code }) }}
        </span>
        <span v-if="duration" class="panel-hint num shrink-0">{{ duration }}</span>
        <div class="flex-1" />
        <AppButton
          size="xs"
          variant="ghost"
          icon="copy"
          :disabled="!hasLines"
          :title="$t('common.copy')"
          @click="copyLog"
        >
          {{ $t("common.copy") }}
        </AppButton>
        <AppButton size="xs" variant="ghost" icon="trash" :disabled="!run" @click="emit('clear')">
          {{ $t("clean.clearLog") }}
        </AppButton>
      </header>

      <div v-if="!run" class="empty-state min-h-0 flex-1">
        <Icon name="terminal" :size="20" class="opacity-50" />
        <strong>{{ $t("clean.noRuns") }}</strong>
        <span>{{ $t("clean.previewFirst") }}</span>
      </div>

      <div v-else-if="!hasLines" class="empty-state min-h-0 flex-1">
        <Icon v-if="run?.status === 'running'" name="spinner" :size="18" class="spin opacity-70" />
        <Icon v-else name="terminal" :size="20" class="opacity-50" />
        <strong>{{ run?.status === "running" ? (run?.preview ? $t("clean.previewing") : $t("clean.running")) : $t("clean.emptyPreview") }}</strong>
      </div>

      <div
        v-else
        ref="viewport"
        class="scroll-thin min-h-0 flex-1 select-text overflow-auto bg-background py-1"
        data-testid="clean-run-log"
        @scroll="onScroll"
      >
        <div
          v-for="(line, index) in lines"
          :key="index"
          class="mono flex gap-2 px-2 text-[11.5px] leading-[18px]"
          :class="line.stream === 'stderr' ? 'text-destructive' : ''"
        >
          <span class="w-7 shrink-0 select-none text-right text-muted-foreground/60">{{ line.n }}</span>
          <span class="min-w-0 whitespace-pre-wrap break-words">{{ line.text }}</span>
        </div>
      </div>
    </section>

    <div
      class="resize-handle resize-handle--row"
      role="separator"
      aria-orientation="horizontal"
      :title="$t('clean.log')"
      @pointerdown="resize.onPointerDown"
    />
  </div>
</template>
