<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { api } from "@/lib/bridge";
import { useAppsStore } from "@/stores/apps";
import { useEngineStore } from "@/stores/engine";
import { useUiStore } from "@/stores/ui";
import type { AppEntry } from "@/types/mole";

const apps = useAppsStore();
const engine = useEngineStore();
const ui = useUiStore();
const { t } = useI18n();

const commandFor = (entry: AppEntry): string => {
  const entrypoint = engine.info?.entry ?? "mo";
  return `"${entrypoint}" uninstall "${entry.uninstall_name}"`;
};

async function copy(entry: AppEntry): Promise<void> {
  try {
    await navigator.clipboard.writeText(commandFor(entry));
    ui.toast(t("apps.commandCopied"), "success");
  } catch {
    ui.toast(t("apps.copyFailed"), "error");
  }
}

function uninstall(entry: AppEntry): void {
  void api.terminalRun("uninstall", entry.uninstall_name);
}

function reveal(entry: AppEntry): void {
  void api.revealPath(entry.path);
}

function openMenu(event: MouseEvent, entry: AppEntry): void {
  ui.openMenu(event, [
    { label: t("apps.uninstall"), icon: "terminal", action: () => uninstall(entry) },
    { label: t("apps.reveal"), icon: "external", action: () => reveal(entry) },
    { label: t("apps.copyCommand"), icon: "copy", action: () => void copy(entry) },
  ]);
}

onMounted(() => {
  if (apps.entries.length === 0) void apps.load();
});

watch(
  () => ui.refreshTick,
  () => void apps.load(),
);
</script>

<template>
  <div class="view">
    <header class="view-head">
      <div class="flex min-w-0 flex-col">
        <span class="view-title">{{ $t("apps.title") }}</span>
        <span class="view-subtitle">{{ $t("apps.subtitle") }}</span>
      </div>
      <div class="flex-1" />
      <div class="flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-2">
        <Icon name="search" :size="13" class="text-muted-foreground" />
        <input
          v-model="apps.query"
          class="h-6 w-[190px] bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/70"
          :placeholder="$t('apps.search')"
          spellcheck="false"
        />
        <button v-if="apps.query" class="text-muted-foreground hover:text-foreground" @click="apps.query = ''">
          <Icon name="x" :size="12" />
        </button>
      </div>
      <AppButton size="sm" variant="ghost" icon="refresh" @click="apps.load()">{{ $t("apps.refresh") }}</AppButton>
    </header>

    <div class="view-scroll view-scroll--flush scroll-thin flex flex-col">
      <div class="flex items-center gap-2 px-4 py-2 text-[11.5px] text-muted-foreground">
        <Icon name="info" :size="12" />
        <span class="truncate">{{ $t("apps.note") }}</span>
      </div>

      <div class="file-table__head mx-0">
        <div class="file-table__cell file-table__name flex-[1.5]">{{ $t("apps.name") }}</div>
        <div class="file-table__cell w-[96px] shrink-0">{{ $t("apps.source") }}</div>
        <div class="file-table__cell flex-[1.4]">{{ $t("apps.bundle") }}</div>
        <div class="file-table__cell flex-[1.7]">{{ $t("apps.path") }}</div>
        <div class="file-table__cell w-[96px] shrink-0 justify-end">{{ $t("apps.action") }}</div>
      </div>

      <div v-if="apps.loading && apps.entries.length === 0" class="empty-state">
        <Icon name="spinner" :size="16" class="spin" />
        {{ $t("apps.loading") }}
      </div>
      <div v-else-if="apps.error" class="empty-state">
        <Icon name="alert" :size="16" class="text-destructive" />
        <span>{{ apps.error }}</span>
        <AppButton size="xs" @click="apps.load()">{{ $t("common.retry") }}</AppButton>
      </div>
      <div v-else-if="apps.filtered.length === 0" class="empty-state">
        <Icon name="search" :size="16" />
        <strong>{{ $t("apps.empty") }}</strong>
      </div>
      <div v-else class="min-h-0 flex-1 overflow-auto scroll-thin">
        <div
          v-for="entry in apps.filtered"
          :key="entry.path"
          class="file-table__row"
          @dblclick="reveal(entry)"
          @contextmenu.prevent="openMenu($event, entry)"
        >
          <div class="file-table__cell file-table__name flex-[1.5]">
            <Icon name="grid" :size="13" class="text-muted-foreground" />
            <span class="min-w-0 flex-1 truncate">{{ entry.name }}</span>
          </div>
          <div class="file-table__cell w-[96px] shrink-0">
            <span class="badge" :data-tone="entry.source === 'Homebrew' ? 'accent' : undefined">{{ entry.source }}</span>
          </div>
          <div class="file-table__cell flex-[1.4] font-mono text-[11px] text-muted-foreground">
            <span class="min-w-0 flex-1 truncate" :title="entry.bundle_id">{{ entry.bundle_id || "—" }}</span>
          </div>
          <div class="file-table__cell flex-[1.7] text-[11.5px] text-muted-foreground">
            <span class="min-w-0 flex-1 truncate" :title="entry.path">{{ entry.path }}</span>
          </div>
          <div class="file-table__cell w-[96px] shrink-0 justify-end">
            <AppButton size="xs" variant="secondary" icon="terminal" :title="$t('apps.uninstallHint')" @click="uninstall(entry)">
              {{ $t("apps.uninstall") }}
            </AppButton>
          </div>
        </div>
      </div>

      <div class="flex h-[26px] shrink-0 items-center gap-3 border-t border-border px-4 text-[10.5px] text-muted-foreground">
        <span>{{ $t("apps.count", { n: apps.entries.length }) }}</span>
        <span>{{ $t("apps.homebrew", { n: apps.homebrew }) }}</span>
        <span v-if="apps.query" class="truncate">{{ apps.filtered.length }} · {{ apps.query }}</span>
      </div>
    </div>
  </div>
</template>
