<script setup lang="ts">
import { computed } from "vue";
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
              <AppButton size="xs" variant="ghost" icon="refresh" @click="engine.load()">{{ $t("settings.refreshNow") }}</AppButton>
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
