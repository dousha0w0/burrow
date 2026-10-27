<script setup lang="ts">
import { computed } from "vue";
import BrandMark from "@/components/ui/BrandMark.vue";
import Icon from "@/components/ui/Icon.vue";
import { useAppsStore } from "@/stores/apps";
import { useEngineStore } from "@/stores/engine";
import { useHistoryStore } from "@/stores/history";
import { useUiStore } from "@/stores/ui";
import type { ViewId } from "@/types/ui";

const ui = useUiStore();
const version = __APP_VERSION__;
const engine = useEngineStore();
const history = useHistoryStore();
const apps = useAppsStore();

const NAV: { view: ViewId; icon: string; label: string }[] = [
  { view: "overview", icon: "gauge", label: "nav.overview" },
  { view: "space", icon: "hard-drive", label: "nav.space" },
  { view: "clean", icon: "broom", label: "nav.clean" },
  { view: "history", icon: "clock", label: "nav.history" },
  { view: "apps", icon: "grid", label: "nav.apps" },
];

const counts = computed<Partial<Record<ViewId, string>>>(() => ({
  history: history.sessions.length > 0 ? String(history.sessions.length) : "",
  apps: apps.entries.length > 0 ? String(apps.entries.length) : "",
}));
</script>

<template>
  <aside class="flex h-full min-h-0 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1.5 px-3 text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
      <span>{{ $t("app.tagline") }}</span>
    </div>

    <nav class="flex flex-col gap-0.5 px-2">
      <button
        v-for="item in NAV"
        :key="item.view"
        class="nav-row w-full text-left"
        :data-active="ui.activeView === item.view || undefined"
        @click="ui.setView(item.view)"
      >
        <Icon :name="item.icon" :size="15" />
        <span class="flex-1 truncate">{{ $t(item.label) }}</span>
        <span v-if="counts[item.view]" class="nav-count">{{ counts[item.view] }}</span>
      </button>
    </nav>

    <div class="mt-3 px-3">
      <div class="section-label">{{ $t("status.engine") }}</div>
    </div>
    <button class="nav-row mx-2 mt-1.5 text-left" :data-active="ui.activeView === 'settings' || undefined" @click="ui.setView('settings')">
      <BrandMark :size="15" class="opacity-80" />
      <div class="min-w-0 flex-1">
        <div class="truncate text-[12px]">{{ engine.info ? $t(`common.source.${engine.info.source}`) : $t("common.engineMissing") }}</div>
        <div class="truncate text-[10.5px] text-muted-foreground">
          {{ engine.info ? `Mole ${engine.version}` : $t("common.engineMissingHint") }}
        </div>
      </div>
      <Icon v-if="!engine.healthy" name="alert" :size="13" class="text-warning" :title="$t('settings.checks')" />
      <Icon name="settings" :size="14" class="text-muted-foreground" />
    </button>

    <div class="flex-1" />

    <div class="px-3 pb-3 text-[10.5px] leading-relaxed text-muted-foreground/80">
      <div>Burrow {{ version }}</div>
      <div>GPL-3.0 · Mole by tw93</div>
    </div>
  </aside>
</template>
