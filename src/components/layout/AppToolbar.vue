<script setup lang="ts">
import { computed } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import BrandMark from "@/components/ui/BrandMark.vue";
import Icon from "@/components/ui/Icon.vue";
import { IS_MOCK } from "@/lib/bridge";
import { useEngineStore } from "@/stores/engine";
import { useStatusStore } from "@/stores/status";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
const engine = useEngineStore();
const status = useStatusStore();

const collected = computed(() => {
  const stamp = status.snapshot?.collected_at;
  if (!stamp) return "";
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
});

function refresh(): void {
  ui.refresh();
  void status.refreshOnce();
}
</script>

<template>
  <header class="app-toolbar flex h-10 shrink-0 items-center gap-2 border-b pl-[84px] pr-2" data-tauri-drag-region>
    <div class="flex items-center gap-2 pl-1">
      <BrandMark :size="19" class="text-foreground" />
      <span class="text-[13px] font-semibold tracking-tight">Burrow</span>
    </div>

    <div class="mx-1 h-4 w-px bg-border" />

    <span class="badge" :data-tone="engine.isBundled ? 'accent' : undefined" v-if="engine.info">
      <Icon name="package" :size="10" />
      Mole {{ engine.version }}
    </span>
    <span v-if="status.watching" class="badge" data-tone="success">
      <Icon name="spinner" :size="10" class="spin" />
      {{ $t("overview.live") }}
    </span>
    <span v-if="IS_MOCK" class="badge" data-tone="warning">{{ $t("status.mock") }}</span>

    <div class="flex min-w-0 flex-1 justify-center">
      <span v-if="collected" class="truncate text-[11px] text-muted-foreground">
        {{ $t("overview.collected") }} {{ collected }}
      </span>
    </div>

    <AppButton size="icon-sm" variant="ghost" icon="refresh" :title="$t('toolbar.refresh')" @click="refresh" />
    <AppButton
      size="icon-sm"
      variant="ghost"
      icon="settings"
      :title="$t('toolbar.settings')"
      :data-active="ui.activeView === 'settings' || undefined"
      @click="ui.setView('settings')"
    />
  </header>
</template>
