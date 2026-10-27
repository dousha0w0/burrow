<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import MetricCard from "@/components/ui/MetricCard.vue";
import { api } from "@/lib/bridge";
import { durationBetween, formatDate } from "@/lib/format";
import { useHistoryStore } from "@/stores/history";
import { useUiStore } from "@/stores/ui";

const history = useHistoryStore();
const ui = useUiStore();

const logs = computed(() => history.report?.logs ?? null);

function isDryRun(command: string): boolean {
  return command.includes("dry-run");
}

function reveal(path: string | undefined): void {
  if (!path) return;
  void api.revealPath(path);
}

onMounted(() => {
  if (!history.report) void history.load();
});

watch(
  () => ui.refreshTick,
  () => void history.load(),
);
</script>

<template>
  <div class="view">
    <header class="view-head">
      <div class="flex min-w-0 flex-col">
        <span class="view-title">{{ $t("history.title") }}</span>
        <span class="view-subtitle">{{ $t("history.subtitle") }}</span>
      </div>
      <div class="flex-1" />
      <AppButton size="sm" variant="ghost" icon="refresh" :title="$t('history.refresh')" @click="history.load()">
        {{ $t("history.refresh") }}
      </AppButton>
    </header>

    <div class="view-scroll scroll-thin">
      <div class="view-grid view-grid--metrics">
        <MetricCard
          icon="broom"
          :label="$t('history.reclaimed')"
          :value="history.reclaimed > 0 ? `${history.reclaimed.toFixed(1)} GB` : '—'"
          :sub="$t('history.destructiveRuns', { n: history.destructive.length })"
        />
        <MetricCard
          icon="list"
          :label="$t('history.sessions')"
          :value="String(history.sessions.length)"
          :sub="$t('history.limitHint', { n: history.limit })"
        />
        <div class="panel p-3">
          <div class="section-label">{{ $t("history.logs") }}</div>
          <div class="mt-2 flex flex-col gap-1.5">
            <button class="flex items-center gap-1.5 text-left text-[12px] hover:text-foreground" :disabled="!logs" @click="reveal(logs?.operations)">
              <Icon name="doc" :size="13" class="text-muted-foreground" />
              <span class="truncate">{{ $t("history.operationsLog") }}</span>
              <Icon v-if="logs" name="external" :size="11" class="ml-auto text-muted-foreground" />
            </button>
            <button class="flex items-center gap-1.5 text-left text-[12px] hover:text-foreground" :disabled="!logs" @click="reveal(logs?.deletions)">
              <Icon name="trash" :size="13" class="text-muted-foreground" />
              <span class="truncate">{{ $t("history.deletionsLog") }}</span>
              <Icon v-if="logs" name="external" :size="11" class="ml-auto text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div class="panel mt-3">
        <div class="file-table__head">
          <div class="file-table__cell file-table__name flex-[1.4]">{{ $t("history.command") }}</div>
          <div class="file-table__cell flex-[1.1]">{{ $t("history.started") }}</div>
          <div class="file-table__cell w-[86px] justify-end">{{ $t("history.duration") }}</div>
          <div class="file-table__cell w-[76px] justify-end">{{ $t("history.items") }}</div>
          <div class="file-table__cell w-[92px] justify-end">{{ $t("history.size") }}</div>
          <div class="file-table__cell flex-[1.3]">{{ $t("history.actions") }}</div>
        </div>

        <div v-if="history.loading && history.sessions.length === 0" class="empty-state">
          <Icon name="spinner" :size="16" class="spin" />
          {{ $t("common.loading") }}
        </div>
        <div v-else-if="history.error" class="empty-state">
          <Icon name="alert" :size="16" class="text-destructive" />
          <span>{{ history.error }}</span>
          <AppButton size="xs" @click="history.load()">{{ $t("common.retry") }}</AppButton>
        </div>
        <div v-else-if="history.sessions.length === 0" class="empty-state">
          <Icon name="clock" :size="16" />
          <strong>{{ $t("history.empty") }}</strong>
        </div>
        <div v-else class="max-h-[calc(100vh-330px)] overflow-auto scroll-thin">
          <div v-for="session in history.sessions" :key="`${session.run_id}-${session.started_at}`" class="file-table__row">
            <div class="file-table__cell file-table__name flex-[1.4]">
              <Icon name="broom" :size="13" class="text-muted-foreground" />
              <span class="truncate font-mono text-[11.5px]">{{ session.command }}</span>
              <span v-if="isDryRun(session.command)" class="badge">{{ $t("history.dryRun") }}</span>
            </div>
            <div class="file-table__cell flex-[1.1] text-muted-foreground">{{ formatDate(session.started_at) }}</div>
            <div class="file-table__cell w-[86px] justify-end num text-muted-foreground">
              {{ durationBetween(session.started_at, session.ended_at) }}
            </div>
            <div class="file-table__cell w-[76px] justify-end num">{{ session.items }}</div>
            <div class="file-table__cell w-[92px] justify-end num font-medium">{{ session.size }}</div>
            <div class="file-table__cell flex-[1.3] text-[11.5px] text-muted-foreground">
              {{ $t("history.actionsSummary", { removed: session.actions.removed, trashed: session.actions.trashed, skipped: session.actions.skipped }) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
