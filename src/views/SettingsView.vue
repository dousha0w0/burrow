<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import AppButton from "@/components/ui/AppButton.vue";
import BrandMark from "@/components/ui/BrandMark.vue";
import Icon from "@/components/ui/Icon.vue";
import Segmented from "@/components/ui/Segmented.vue";
import { currentLocale, LOCALES, setLocale, type Locale } from "@/i18n";
import { IS_MOCK, api } from "@/lib/bridge";
import { DEFAULT_PREFERENCES, type Corners, type Density, type LayoutMode, type Palette, type ThemeMode } from "@/lib/prefs";
import { useEngineStore } from "@/stores/engine";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
const engine = useEngineStore();
const { t } = useI18n();

onMounted(() => {
  if (!engine.environment) void engine.loadEnvironment();
  if (!engine.updates) void engine.checkUpdates();
});

const themeOptions = computed(() => [
  { value: "light", label: t("settings.themeLight") },
  { value: "dark", label: t("settings.themeDark") },
  { value: "system", label: t("settings.themeSystem") },
]);

const paletteOptions = computed(() => [
  { value: "neutral", label: t("settings.paletteNeutral") },
  { value: "graphite", label: t("settings.paletteGraphite") },
  { value: "vscode", label: t("settings.paletteVscode") },
]);

const cornerOptions = computed(() => [
  { value: "default", label: t("settings.cornersDefault") },
  { value: "small", label: t("settings.cornersSmall") },
  { value: "none", label: t("settings.cornersNone") },
]);

const layoutOptions = computed(() => [
  { value: "classic", label: t("settings.layoutClassic") },
  { value: "separated", label: t("settings.layoutSeparated") },
]);

const densityOptions = computed(() => [
  { value: "comfortable", label: t("settings.densityComfortable") },
  { value: "compact", label: t("settings.densityCompact") },
]);

const intervalOptions = [
  { value: "1", label: "1s" },
  { value: "2", label: "2s" },
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
];

const localeOptions = LOCALES.map((locale) => ({ value: locale.value, label: locale.label }));

function setLocaleFrom(value: string): void {
  setLocale(value as Locale);
}

function setTheme(value: string): void {
  ui.setPrefs({ themeMode: value as ThemeMode });
}

function setPalette(value: string): void {
  ui.setPrefs({ palette: value as Palette });
}

function setCorners(value: string): void {
  ui.setPrefs({ corners: value as Corners });
}

function setLayout(value: string): void {
  ui.setPrefs({ layout: value as LayoutMode });
}

function setDensity(value: string): void {
  ui.setPrefs({ density: value as Density });
}

function setInterval(value: string): void {
  ui.setPrefs({ refreshInterval: Number(value) });
}

function resetAppearance(): void {
  ui.setPrefs({
    themeMode: DEFAULT_PREFERENCES.themeMode,
    palette: DEFAULT_PREFERENCES.palette,
    corners: DEFAULT_PREFERENCES.corners,
    layout: DEFAULT_PREFERENCES.layout,
    density: DEFAULT_PREFERENCES.density,
  });
  ui.toast(t("settings.resetAppearance"), "success");
}

function openMole(): void {
  void api.openExternal("https://github.com/tw93/Mole");
}

function openRelease(url: string | null): void {
  if (url) void api.openExternal(url);
}

function updateEngine(): void {
  void api.terminalRun("update");
}

function openPrivacy(): void {
  void api.openPrivacySettings();
}

function refreshAll(): void {
  void engine.load();
  void engine.loadEnvironment();
}

interface UpdateRow {
  id: "engine" | "app";
  label: string;
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  url: string | null;
  error: string | null;
}

const checkedTime = computed(() => {
  const at = engine.updates?.checkedAt;
  if (!at) return "";
  return new Date(at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
});

const updateRows = computed<UpdateRow[]>(() => {
  const report = engine.updates;
  if (!report) return [];
  return [
    { id: "engine", label: t("settings.updateEngine"), ...report.engine },
    { id: "app", label: t("settings.updateApp"), ...report.app },
  ];
});

function updateState(row: UpdateRow): string {
  if (row.error) return t("settings.updateFailed");
  if (!row.latest) return t("settings.updateUnknown");
  return row.updateAvailable ? t("settings.updateAvailable") : t("settings.upToDate");
}

function updateTone(row: UpdateRow): "success" | "warning" | undefined {
  if (row.error || !row.latest) return undefined;
  return row.updateAvailable ? "warning" : "success";
}
</script>

<template>
  <div class="view">
    <header class="view-head">
      <div class="flex min-w-0 flex-col">
        <span class="view-title">{{ $t("settings.title") }}</span>
        <span class="view-subtitle">{{ $t("settings.subtitle") }}</span>
      </div>
      <div class="flex-1" />
      <AppButton size="sm" variant="ghost" icon="rotate-ccw" @click="resetAppearance">{{ $t("settings.resetAppearance") }}</AppButton>
    </header>

    <div class="view-scroll scroll-thin">
      <div class="view-grid view-grid--split">
        <div class="flex flex-col gap-3">
          <section class="panel">
            <div class="panel-head">
              <Icon name="sun" :size="13" class="text-muted-foreground" />
              {{ $t("settings.appearance") }}
              <div class="flex-1" />
              <span class="panel-hint">{{ $t("settings.theme") }}</span>
            </div>
            <div class="panel-body flex flex-col gap-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.theme") }}</span>
                <Segmented
                  :model-value="ui.prefs.themeMode"
                  :options="themeOptions"
                  compact
                  @update:model-value="setTheme"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.palette") }}</span>
                <Segmented
                  :model-value="ui.prefs.palette"
                  :options="paletteOptions"
                  compact
                  @update:model-value="setPalette"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.corners") }}</span>
                <Segmented
                  :model-value="ui.prefs.corners"
                  :options="cornerOptions"
                  compact
                  @update:model-value="setCorners"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.layout") }}</span>
                <Segmented
                  :model-value="ui.prefs.layout"
                  :options="layoutOptions"
                  compact
                  @update:model-value="setLayout"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.density") }}</span>
                <Segmented
                  :model-value="ui.prefs.density"
                  :options="densityOptions"
                  compact
                  @update:model-value="setDensity"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.language") }}</span>
                <Segmented :model-value="currentLocale()" :options="localeOptions" compact @update:model-value="setLocaleFrom" />
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <Icon name="gauge" :size="13" class="text-muted-foreground" />
              {{ $t("settings.behavior") }}
            </div>
            <div class="panel-body flex flex-col gap-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.refreshInterval") }}</span>
                <Segmented :model-value="String(ui.prefs.refreshInterval)" :options="intervalOptions" compact @update:model-value="setInterval" />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.shortcuts") }}</span>
                <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span class="kbd">⌘1</span>–<span class="kbd">⌘6</span>
                  <span class="mx-1">{{ $t("settings.shortcutViews") }}</span>
                </div>
              </div>
              <div class="text-[11px] text-muted-foreground">{{ $t("settings.shortcutRefresh") }}</div>
            </div>
          </section>
        </div>

        <div class="flex flex-col gap-3">
          <section class="panel">
            <div class="panel-head">
              <BrandMark :size="14" />
              {{ $t("settings.engine") }}
              <div class="flex-1" />
              <AppButton size="xs" variant="ghost" icon="refresh" @click="refreshAll">{{ $t("settings.refreshNow") }}</AppButton>
            </div>
            <div class="panel-body flex flex-col gap-2.5">
              <div v-if="engine.error" class="flex items-start gap-1.5 text-[11.5px] text-destructive">
                <Icon name="alert" :size="13" class="mt-0.5" />
                <span>{{ engine.error }}</span>
              </div>
              <template v-else-if="engine.info">
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-[11.5px] text-muted-foreground">{{ $t("settings.engineVersion") }}</span>
                  <span class="num text-[12.5px] font-medium">Mole {{ engine.version }}</span>
                </div>
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-[11.5px] text-muted-foreground">{{ $t("settings.engineSource") }}</span>
                  <span class="badge" :data-tone="engine.isBundled ? 'accent' : undefined">{{ $t(`common.source.${engine.info.source}`) }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-[11.5px] text-muted-foreground">{{ $t("settings.engineRoot") }}</span>
                  <span class="break-all font-mono text-[11px]">{{ engine.info.root }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-[11.5px] text-muted-foreground">{{ $t("settings.enginePath") }}</span>
                  <span class="break-all font-mono text-[11px]">{{ engine.info.entry }}</span>
                </div>
                <div class="border-t border-border pt-2">
                  <div class="section-label mb-1.5">{{ $t("settings.checks") }}</div>
                  <div v-if="engine.environment" class="flex flex-col gap-1">
                    <div
                      v-for="item in engine.environment.engine.checks"
                      :key="item.id"
                      class="flex items-center gap-1.5 text-[11.5px]"
                      :class="item.ok ? '' : 'text-destructive'"
                    >
                      <Icon :name="item.ok ? 'check-circle' : 'alert'" :size="12" />
                      <span class="shrink-0">{{ $t(`settings.check_${item.id}`) }}</span>
                      <span
                        class="ml-auto min-w-0 truncate text-right font-mono text-[10.5px] text-muted-foreground"
                        :title="item.detail ?? ''"
                      >{{ item.detail ?? "" }}</span>
                    </div>
                  </div>
                  <div v-else-if="engine.environmentLoading" class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Icon name="spinner" :size="12" class="spin" />
                    {{ $t("common.loading") }}
                  </div>
                  <div v-else-if="engine.environmentError" class="flex items-start gap-1.5 text-[11px] text-destructive">
                    <Icon name="alert" :size="12" class="mt-0.5" />
                    <span>{{ engine.environmentError }}</span>
                  </div>
                  <p class="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{{ $t("settings.checkHint") }}</p>
                </div>
              </template>
              <div v-else class="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Icon name="spinner" :size="13" class="spin" />
                {{ $t("common.loading") }}
              </div>
              <div v-if="IS_MOCK" class="flex items-start gap-1.5 rounded-[5px] border border-border bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
                <Icon name="info" :size="12" class="mt-0.5" />
                {{ $t("settings.mockNote") }}
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <Icon name="refresh" :size="13" class="text-muted-foreground" />
              {{ $t("settings.update") }}
              <div class="flex-1" />
              <span v-if="checkedTime" class="panel-hint">{{ $t("settings.checkedAt", { time: checkedTime }) }}</span>
            </div>
            <div class="panel-body flex flex-col gap-2.5">
              <div v-if="engine.updatesLoading && !engine.updates" class="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Icon name="spinner" :size="12" class="spin" />
                {{ $t("settings.checkingUpdates") }}
              </div>
              <div v-else-if="!engine.updates" class="flex items-center justify-between gap-3">
                <span class="text-[11.5px] text-muted-foreground">{{ $t("settings.updateUnknown") }}</span>
                <AppButton size="xs" variant="secondary" icon="refresh" @click="engine.checkUpdates()">
                  {{ $t("settings.checkUpdates") }}
                </AppButton>
              </div>
              <template v-else>
                <div v-for="row in updateRows" :key="row.id" class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[12.5px]">{{ row.label }}</span>
                    <span class="badge" :data-tone="updateTone(row)">{{ updateState(row) }}</span>
                    <div class="flex-1" />
                    <AppButton
                      v-if="row.url"
                      size="xs"
                      variant="ghost"
                      icon="external"
                      :title="$t('settings.openRelease')"
                      @click="openRelease(row.url)"
                    />
                  </div>
                  <div class="num text-[11px] text-muted-foreground">
                    {{ $t("settings.currentVersion") }} {{ row.current }} · {{ $t("settings.latestVersion") }}
                    {{ row.latest ?? "—" }}
                  </div>
                  <div v-if="row.error" class="text-[11px] text-destructive">{{ row.error }}</div>
                  <div
                    v-else-if="row.id === 'engine' && row.updateAvailable"
                    class="flex items-center gap-2 text-[11px] text-muted-foreground"
                  >
                    <template v-if="engine.isBundled">{{ $t("settings.bundledUpdateHint") }}</template>
                    <AppButton v-else size="xs" variant="secondary" icon="terminal" @click="updateEngine">
                      {{ $t("settings.updateInTerminal") }}
                    </AppButton>
                  </div>
                </div>
                <div class="flex items-center gap-2 border-t border-border pt-2">
                  <span v-if="engine.updatesLoading" class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Icon name="spinner" :size="12" class="spin" />
                    {{ $t("settings.checkingUpdates") }}
                  </span>
                  <span v-else-if="engine.updatesError" class="min-w-0 flex-1 truncate text-[11px] text-destructive">{{ engine.updatesError }}</span>
                  <div class="flex-1" />
                  <AppButton size="xs" variant="secondary" icon="refresh" :disabled="engine.updatesLoading" @click="engine.checkUpdates()">
                    {{ $t("settings.checkUpdates") }}
                  </AppButton>
                </div>
              </template>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <Icon name="shield" :size="13" class="text-muted-foreground" />
              {{ $t("settings.permissions") }}
              <div class="flex-1" />
              <span class="badge" :data-tone="engine.fullDiskAccess ? 'success' : 'warning'">
                {{ engine.fullDiskAccess ? $t("settings.granted") : $t("settings.denied") }}
              </span>
            </div>
            <div class="panel-body flex flex-col gap-2.5">
              <div class="flex items-center justify-between gap-3">
                <span class="text-[12.5px]">{{ $t("settings.fullDiskAccess") }}</span>
                <AppButton size="xs" variant="secondary" icon="external" @click="openPrivacy">
                  {{ $t("settings.openPrivacySettings") }}
                </AppButton>
              </div>
              <p class="m-0 text-[11px] leading-relaxed text-muted-foreground">{{ $t("settings.permissionHint") }}</p>
              <details v-if="engine.environment" class="text-[11px] text-muted-foreground">
                <summary class="cursor-default select-none">{{ $t("settings.probes") }}</summary>
                <div class="mt-1.5 flex flex-col gap-1">
                  <div v-for="probe in engine.environment.permissions.probes" :key="probe.path" class="flex items-center gap-2">
                    <Icon :name="probe.readable ? 'check' : 'x'" :size="11" />
                    <span class="min-w-0 flex-1 truncate font-mono text-[10.5px]" :title="probe.path">{{ probe.path }}</span>
                    <span class="shrink-0">{{ probe.readable ? $t("settings.readable") : $t("settings.unreadable") }}</span>
                  </div>
                </div>
              </details>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <Icon name="package" :size="13" class="text-muted-foreground" />
              {{ $t("settings.install") }}
              <div class="flex-1" />
              <span
                v-if="engine.environment"
                class="badge"
                :data-tone="engine.environment.install.inApplications ? 'success' : 'warning'"
              >
                {{ engine.environment.install.inApplications ? $t("settings.inApplications") : $t("settings.notInApplications") }}
              </span>
            </div>
            <div class="panel-body flex flex-col gap-2">
              <div class="flex flex-col gap-1">
                <span class="text-[11.5px] text-muted-foreground">{{ $t("settings.installPath") }}</span>
                <span class="break-all font-mono text-[11px]">{{ engine.environment?.install.appPath ?? "—" }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[11.5px] text-muted-foreground">{{ $t("settings.quarantined") }}</span>
                <span
                  class="badge"
                  :data-tone="engine.environment?.install.quarantined ? 'warning' : 'success'"
                >
                  {{ engine.environment?.install.quarantined ? $t("settings.quarantined") : $t("settings.notQuarantined") }}
                </span>
              </div>
              <p class="m-0 text-[11px] leading-relaxed text-muted-foreground">{{ $t("settings.installHint") }}</p>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <Icon name="info" :size="13" class="text-muted-foreground" />
              {{ $t("settings.about") }}
            </div>
            <div class="panel-body flex flex-col gap-2.5 text-[11.5px] leading-relaxed">
              <p class="m-0 text-muted-foreground">{{ $t("settings.aboutBody") }}</p>
              <p class="m-0 text-muted-foreground">{{ $t("settings.credits") }}</p>
              <div class="flex items-center justify-between gap-3 border-t border-border pt-2">
                <span class="text-muted-foreground">{{ $t("settings.license") }}</span>
                <span class="text-[11px]">{{ $t("settings.licenseValue") }}</span>
              </div>
              <AppButton size="xs" variant="secondary" icon="external" class="self-start" @click="openMole">{{ $t("settings.openMoleRepo") }}</AppButton>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
