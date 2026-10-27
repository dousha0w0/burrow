<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "@/components/ui/Icon.vue";
import { groupCleanPreview, stripAnsi, type PreviewItem } from "@/lib/parse-run";
import type { RunKind } from "@/types/mole";

const props = defineProps<{ lines: string[]; kind: RunKind; running: boolean }>();

const closed = ref<Record<number, boolean>>({});

const sections = computed(() => groupCleanPreview(props.lines));

/**
 * Purge previews are a flat list rather than headings + items, so they are
 * decoded here into the same label/meta rows the clean sections use.
 */
const flat = computed<PreviewItem[]>(() => {
  if (props.kind !== "purge") return [];
  const items: PreviewItem[] = [];
  for (const raw of props.lines) {
    const line = stripAnsi(raw).trim();
    if (!line || line.startsWith("=")) continue;
    const marker = /^(?:[✓◎⚠!→⊙])\s*(.+)$/.exec(line);
    if (!marker) continue;
    let body = marker[1].trim().replace(/^\[DRY RUN\]\s*/i, "");
    if (!body) continue;
    let meta: string | null = null;
    const sized = /^(.+?),\s*([0-9.]+\s*[KMGT]?B\+?)$/.exec(body);
    if (sized) {
      body = sized[1].trim();
      meta = sized[2];
    }
    items.push({ label: body, meta, path: null, tone: "item" });
  }
  return items;
});

const cleanCount = computed(() => sections.value.reduce((sum, section) => sum + section.items.length, 0));
const totalItems = computed(() => (props.kind === "clean" ? cleanCount.value : flat.value.length));
const hasContent = computed(() => totalItems.value > 0 || (props.kind === "clean" && sections.value.length > 0));

function toggle(index: number): void {
  closed.value = { ...closed.value, [index]: !closed.value[index] };
}
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <Icon :name="kind === 'clean' ? 'layers' : 'package'" :size="13" />
      <span>{{ kind === "clean" ? $t("clean.sections") : $t("clean.projectTab") }}</span>
      <span class="panel-hint truncate">{{ kind === "clean" ? $t("clean.scanDirs") : $t("clean.projectHint") }}</span>
      <div class="flex-1" />
      <span v-if="running" class="badge" data-tone="accent">
        <Icon name="spinner" :size="10" class="spin" />
        {{ $t("clean.previewing") }}
      </span>
      <span v-else-if="kind === 'clean' && sections.length" class="badge">
        {{ $t("clean.categories", { n: sections.length }) }}
      </span>
    </header>

    <div v-if="!hasContent" class="empty-state">
      <Icon name="scan" :size="22" class="opacity-60" />
      <strong>{{ running ? $t("clean.previewing") : $t("clean.emptyPreview") }}</strong>
      <span class="max-w-[420px]">{{ $t("clean.previewHint") }}</span>
    </div>

    <div v-else class="scroll-thin max-h-[400px] overflow-auto">
      <template v-if="kind === 'clean'">
        <div v-for="(section, index) in sections" :key="index" class="border-b border-border last:border-b-0">
          <button
            type="button"
            class="flex h-7 w-full items-center gap-1.5 px-3 text-left text-[11px] text-muted-foreground hover:bg-muted"
            :aria-expanded="!closed[index]"
            @click="toggle(index)"
          >
            <Icon :name="closed[index] ? 'chevron-right' : 'chevron-down'" :size="11" />
            <span class="truncate font-medium text-foreground">{{ section.title }}</span>
            <span class="ml-auto num text-[10.5px]">{{ section.items.length }}</span>
          </button>

          <div v-if="!closed[index]">
            <div
              v-for="(item, itemIndex) in section.items"
              :key="itemIndex"
              class="flex h-[26px] items-center gap-1.5 border-t border-border/50 pl-[26px] pr-3 text-[12px]"
              :title="item.path ?? item.label"
            >
              <Icon
                :name="item.tone === 'item' ? 'check' : 'info'"
                :size="11"
                class="shrink-0 opacity-55"
              />
              <span
                class="min-w-0 flex-1 truncate"
                :class="item.tone === 'skip' ? 'text-muted-foreground' : ''"
              >{{ item.label }}</span>
              <span v-if="item.meta" class="num shrink-0 text-[11px] text-muted-foreground">{{ item.meta }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-for="(item, index) in flat"
          :key="index"
          class="flex h-[26px] items-center gap-1.5 border-b border-border/50 px-3 text-[12px] last:border-b-0"
          :title="item.label"
        >
          <Icon name="check" :size="11" class="shrink-0 opacity-55" />
          <span class="min-w-0 flex-1 truncate font-normal">{{ item.label }}</span>
          <span v-if="item.meta" class="num shrink-0 text-[11px] text-muted-foreground">{{ item.meta }}</span>
        </div>
      </template>
    </div>
  </section>
</template>
