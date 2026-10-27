<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import AppToolbar from "@/components/layout/AppToolbar.vue";
import StatusBar from "@/components/layout/StatusBar.vue";
import ContextMenu from "@/components/ui/ContextMenu.vue";
import ToastHost from "@/components/ui/ToastHost.vue";
import AppsView from "@/views/AppsView.vue";
import CleanView from "@/views/CleanView.vue";
import HistoryView from "@/views/HistoryView.vue";
import OverviewView from "@/views/OverviewView.vue";
import SettingsView from "@/views/SettingsView.vue";
import SpaceView from "@/views/SpaceView.vue";
import { useResizeHandle } from "@/composables/useResizeHandle";
import { api } from "@/lib/bridge";
import { useEngineStore } from "@/stores/engine";
import { useHistoryStore } from "@/stores/history";
import { useRunsStore } from "@/stores/runs";
import { useStatusStore } from "@/stores/status";
import { useUiStore } from "@/stores/ui";
import type { ViewId } from "@/types/ui";

const ui = useUiStore();
const status = useStatusStore();
const engine = useEngineStore();
const runs = useRunsStore();
const history = useHistoryStore();

const VIEWS = {
  overview: OverviewView,
  space: SpaceView,
  clean: CleanView,
  history: HistoryView,
  apps: AppsView,
  settings: SettingsView,
} as const;

const currentView = computed(() => VIEWS[ui.activeView]);
const sidebarWidth = ref(ui.prefs.sidebarWidth);

const sidebarResize = useResizeHandle({
  axis: "x",
  direction: 1,
  current: () => sidebarWidth.value,
  min: 204,
  max: () => Math.min(320, Math.round(window.innerWidth * 0.38)),
  onChange: (value) => (sidebarWidth.value = value),
  onCommit: (value) => ui.setSidebarWidth(value),
});

const ORDER: ViewId[] = ["overview", "space", "clean", "history", "apps", "settings"];

function onKeydown(event: KeyboardEvent): void {
  if (!event.metaKey || event.altKey || event.ctrlKey) return;
  const index = Number.parseInt(event.key, 10);
  if (index >= 1 && index <= ORDER.length) {
    event.preventDefault();
    ui.setView(ORDER[index - 1]);
    return;
  }
  if (event.key === ",") {
    event.preventDefault();
    ui.setView("settings");
    return;
  }
  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    ui.refresh();
    void status.refreshOnce();
  }
}

onMounted(async () => {
  window.addEventListener("keydown", onKeydown);
  void api.uiReady();
  void engine.loadEnvironment().then(() => {
    const env = engine.environment;
    if (!env) return;
    const failed = env.engine.checks.filter((item) => !item.ok).map((item) => item.id);
    void api.logMessage(
      "info",
      `environment install=${env.install.appPath} inApplications=${env.install.inApplications} quarantined=${env.install.quarantined} engine=${env.engine.ok ? "ok" : `failed:${failed.join(",")}`} fda=${env.permissions.fullDiskAccess}`,
    );
  });
  void engine.load().then(() => {
    const info = engine.info;
    if (info) void api.logMessage("info", `engine ${info.source} ${info.version} @ ${info.entry}`);
    else if (engine.error) void api.logMessage("error", `engine unavailable: ${engine.error}`);
  });
  void runs.init();
  void history.load();
  await status.start(ui.prefs.refreshInterval);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  void status.stop();
});

watch(
  () => ui.prefs.refreshInterval,
  (seconds) => void status.restart(seconds),
);

watch(
  () => ui.prefs.sidebarWidth,
  (width) => (sidebarWidth.value = width),
);
</script>

<template>
  <div class="app-root">
    <AppToolbar />

    <div class="app-body" :data-layout="ui.prefs.layout">
      <div class="app-sidebar app-pane relative" :style="{ width: `${sidebarWidth}px` }">
        <AppSidebar />
        <div class="resize-handle resize-handle--right" @pointerdown="sidebarResize.onPointerDown" />
      </div>

      <main class="app-workspace app-pane">
        <component :is="currentView" />
      </main>
    </div>

    <StatusBar />
    <ContextMenu />
    <ToastHost />
  </div>
</template>
