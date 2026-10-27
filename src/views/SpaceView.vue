<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import Treemap from "@/components/space/Treemap.vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import Segmented from "@/components/ui/Segmented.vue";
import { api, IS_MOCK } from "@/lib/bridge";
import { formatBytes, formatPercent, shortPath } from "@/lib/format";
import { useSpaceStore } from "@/stores/space";
import { useUiStore } from "@/stores/ui";
import type { SpaceEntry } from "@/types/mole";
import type { MenuItem } from "@/types/ui";

const { t } = useI18n();
const space = useSpaceStore();
const ui = useUiStore();

const selected = ref<string | null>(null);

const overview = computed(() => space.report?.overview === true);
const currentPath = computed(() => space.report?.path ?? space.path ?? "");

/** macOS home root, derived from the path being shown — the engine gives no
 * separate `$HOME`, yet breadcrumbs should read `~/Library/...`. */
const home = computed(() => {
  const source = space.report?.path ?? space.path ?? "";
  const direct = /^\/Users\/[^/]+/.exec(source);
  if (direct) return direct[0];
  const entry = (space.report?.entries ?? []).find((item) => /^\/Users\/[^/]+$/.test(item.path));
  return entry?.path ?? "";
});

const crumbs = computed<string[]>(() => {
  if (!space.report || overview.value) return [];
  const label = shortPath(space.report.path || space.path || "", home.value);
  const parts = label.split("/").filter(Boolean);
  if (parts.length <= 4) return parts;
  return [parts[0], "…", ...parts.slice(-3)];
});

const sortOptions = computed(() => [
  { value: "size", label: t("space.size") },
  { value: "name", label: t("space.name") },
]);

/** The store's history starts empty after drilling out of the machine overview
 * (the overview is addressed as `null`), so the overview itself is the floor. */
const canUp = computed(() => space.canGoUp || (space.report !== null && !space.report.overview));

function goUp(): void {
  if (space.loading) return;
  if (space.canGoUp) void space.up();
  else if (space.report && !space.report.overview) void space.overview();
}

function setSort(value: string): void {
  space.sort = value === "name" ? "name" : "size";
}

function reload(): void {
  if (space.loading) return;
  void space.open(space.path);
}

function shareOf(entry: SpaceEntry): number {
  return space.share(entry);
}

function percentOf(entry: SpaceEntry): string {
  const value = shareOf(entry);
  return formatPercent(value, value < 10 ? 1 : 0);
}

function openEntry(entry: SpaceEntry): void {
  if (entry.is_dir) void space.drill(entry);
}

function drillEntry(entry: SpaceEntry): void {
  void space.drill(entry);
}

async function chooseFolder(): Promise<void> {
  if (IS_MOCK) {
    ui.toast(t("space.pickerUnavailable"));
    return;
  }
  try {
    const picked = await openDialog({ directory: true, multiple: false, title: t("space.pickFolder") });
    if (typeof picked === "string" && picked) {
      space.history.splice(0, space.history.length);
      await space.open(picked);
    }
  } catch (cause) {
    ui.toast(cause instanceof Error ? cause.message : String(cause), "error");
  }
}

async function revealEntry(entry: SpaceEntry): Promise<void> {
  try {
    await api.revealPath(entry.path);
  } catch (cause) {
    ui.toast(cause instanceof Error ? cause.message : String(cause), "error");
  }
}

async function copyEntryPath(entry: SpaceEntry): Promise<void> {
  try {
    await navigator.clipboard.writeText(entry.path);
    ui.toast(t("common.copied"), "success");
  } catch {
    ui.toast(t("common.failed"), "error");
  }
}

function openRowMenu(entry: SpaceEntry, event: MouseEvent): void {
  selected.value = entry.path;
  const items: MenuItem[] = [];
  if (entry.is_dir) {
    items.push({ label: t("space.drill"), icon: "folder-open", action: () => void space.drill(entry) });
    items.push({ label: "", separator: true });
  }
  items.push({ label: t("space.reveal"), icon: "eye", action: () => void revealEntry(entry) });
  items.push({ label: t("space.copyPath"), icon: "copy", action: () => void copyEntryPath(entry) });
  ui.openMenu(event, items);
}

watch(
  () => space.report,
  () => {
    selected.value = null;
  },
);

watch(
  () => ui.refreshTick,
  () => reload(),
);

onMounted(() => {
  if (!space.report) void space.open(null);
});
</script>

<template>
  <div class="view">
    <header class="view-head">
      <AppButton
        size="icon-sm"
        variant="ghost"
        icon="arrow-left"
        :disabled="!canUp"
        :title="$t('space.up')"
        @click="goUp()"
      />

      <div class="flex min-w-0 flex-1 items-baseline gap-2">
        <span class="view-title shrink-0">{{ $t("space.title") }}</span>
        <span v-if="overview" class="view-subtitle truncate">{{ $t("space.overview") }}</span>
        <nav v-else class="flex min-w-0 items-center gap-0.5 text-[11.5px] text-muted-foreground" :title="currentPath">
          <template v-for="(crumb, index) in crumbs" :key="`${crumb}-${index}`">
            <Icon v-if="index" name="chevron-right" :size="11" class="shrink-0 text-muted-foreground/60" />
            <span class="truncate" :class="index === crumbs.length - 1 ? 'text-foreground' : ''">{{ crumb }}</span>
          </template>
        </nav>

        <span
          v-if="space.report?.scan_status === 'partial'"
          class="badge scan-badge"
          data-tone="warning"
          :title="$t('space.partial')"
        >
          {{ $t("space.partial") }}
        </span>

        <span class="ml-auto shrink-0 text-[11px] text-muted-foreground num">
          {{ space.report ? formatBytes(space.totalSize) : "—" }}
        </span>
      </div>

      <AppButton size="sm" variant="secondary" icon="folder-open" :title="$t('space.pickFolder')" @click="chooseFolder">
        {{ $t("space.pickFolder") }}
      </AppButton>
      <AppButton v-if="space.loading" size="sm" variant="ghost" icon="stop" @click="space.cancel()">
        {{ $t("space.cancel") }}
      </AppButton>
      <AppButton
        v-else
        size="sm"
        variant="ghost"
        icon="refresh"
        :disabled="!space.report"
        :title="$t('space.rescan')"
        @click="reload()"
      >
        {{ $t("space.rescan") }}
      </AppButton>
    </header>

    <div class="space-frame">
      <div class="view-scroll view-scroll--flush">
        <div class="view-scroll space-scroll">
          <div v-if="space.error" class="panel">
            <div class="empty-state">
              <Icon name="alert" :size="20" class="text-destructive" />
              <strong>{{ $t("common.failed") }}</strong>
              <span class="max-w-[540px] break-words">{{ space.error }}</span>
              <AppButton size="xs" variant="secondary" icon="refresh" @click="reload()">
                {{ $t("common.retry") }}
              </AppButton>
            </div>
          </div>

          <template v-else-if="space.report">
            <div v-if="!space.entries.length" class="panel">
              <div class="empty-state">
                <Icon name="folder-open" :size="22" />
                <strong>{{ $t("space.empty") }}</strong>
                <span class="mono text-[11px]">{{ currentPath }}</span>
              </div>
            </div>

            <template v-else>
              <section class="panel">
                <div class="panel-head">
                  <span class="section-label">{{ $t("space.treemap") }}</span>
                </div>
                <div class="panel-body panel-body--flush">
                  <Treemap
                    :entries="space.topLevel"
                    :total="space.topLevelTotal"
                    @drill="drillEntry"
                  />
                </div>
              </section>

              <section class="panel">
                <div class="panel-head">
                  <span class="section-label">{{ $t("space.total") }} {{ formatBytes(space.totalSize) }}</span>
                  <span class="panel-hint num">{{ $t("space.entries", { n: space.entries.length }) }}</span>
                  <span
                    v-if="space.nestedTotal > 0"
                    class="badge"
                    :title="$t('space.shareHint')"
                  >
                    {{ $t("space.overlap", { size: formatBytes(space.nestedTotal) }) }}
                  </span>
                  <div class="flex-1" />
                  <Segmented
                    compact
                    :model-value="space.sort"
                    :options="sortOptions"
                    @update:model-value="setSort"
                  />
                </div>

                <div class="file-table">
                  <div class="file-table__head">
                    <div class="file-table__head-cell col-name">
                      <span class="truncate">{{ $t("space.name") }}</span>
                    </div>
                    <div class="file-table__head-cell file-table__cell--num col-size">
                      <span>{{ $t("space.size") }}</span>
                    </div>
                    <div class="file-table__head-cell col-share" :title="$t('space.shareHint')">
                      <span>{{ $t("space.share") }}</span>
                    </div>
                    <div class="file-table__head-cell col-kind">
                      <span>{{ $t("space.kind") }}</span>
                    </div>
                  </div>

                  <div class="file-table__viewport">
                    <div
                      v-for="entry in space.entries"
                      :key="entry.path"
                      class="file-table__row"
                      :data-selected="selected === entry.path || undefined"
                      tabindex="0"
                      @click="selected = entry.path"
                      @dblclick="openEntry(entry)"
                      @keydown.enter="openEntry(entry)"
                      @contextmenu.prevent="openRowMenu(entry, $event)"
                    >
                      <div class="file-table__cell col-name">
                        <Icon
                          :name="entry.is_dir ? 'folder' : 'file'"
                          :size="13"
                          class="text-muted-foreground"
                        />
                        <span class="file-table__name">{{ entry.name }}</span>
                        <span v-if="entry.cleanable || entry.insight" class="badge shrink-0" data-tone="accent">
                          {{ $t("space.insight") }}
                        </span>
                      </div>
                      <div class="file-table__cell file-table__cell--num col-size">
                        <span class="num">{{ formatBytes(entry.size) }}</span>
                      </div>
                      <div class="file-table__cell col-share">
                        <template v-if="space.parentOf(entry)">
                          <span
                            class="badge shrink-0"
                            :title="$t('space.inParentHint', { name: space.parentOf(entry)?.name })"
                          >
                            {{ $t("space.inParent", { name: space.parentOf(entry)?.name }) }}
                          </span>
                        </template>
                        <template v-else>
                          <div class="min-w-0 flex-1">
                            <ProgressBar :value="shareOf(entry)" :height="4" />
                          </div>
                          <span class="num w-9 shrink-0 text-right text-[11px] text-muted-foreground">
                            {{ percentOf(entry) }}
                          </span>
                        </template>
                      </div>
                      <div class="file-table__cell file-table__cell--muted col-kind">
                        <span>{{ entry.is_dir ? $t("space.folder") : $t("space.file") }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </template>
          </template>

          <div v-else-if="space.loading" class="panel">
            <div class="empty-state">
              <Icon name="spinner" :size="18" class="spin" />
              <strong>{{ $t("space.scanning") }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div v-if="space.loading && space.report" class="space-overlay">
        <div class="flex items-center gap-2 rounded-md border border-border bg-popover px-3 py-1.5 text-[12px]">
          <Icon name="spinner" :size="13" class="spin" />
          <span>{{ $t("space.scanning") }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.space-frame {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}
.space-scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scan-badge {
  min-width: 0;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.space-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 40px;
  background: color-mix(in srgb, var(--background) 55%, transparent);
  pointer-events: none;
}
.space-overlay > * {
  pointer-events: auto;
}
.col-name {
  flex: 1 1 auto;
  min-width: 0;
}
.col-size {
  flex: 0 0 96px;
  width: 96px;
}
.col-share {
  flex: 0 0 168px;
  width: 168px;
}
.col-kind {
  flex: 0 0 84px;
  width: 84px;
}
@media (max-width: 860px) {
  .col-kind {
    display: none;
  }
}
@media (max-width: 720px) {
  .col-share {
    flex-basis: 124px;
    width: 124px;
  }
}
</style>
