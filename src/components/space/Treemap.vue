<script setup lang="ts">
import { computed } from "vue";
import { formatBytes, formatPercent } from "@/lib/format";
import type { SpaceEntry } from "@/types/mole";

const props = defineProps<{ entries: SpaceEntry[]; total: number }>();
const emit = defineEmits<{ drill: [entry: SpaceEntry] }>();

const WIDTH = 1000;
const HEIGHT = 200;
const MAX_TILES = 16;
const LIMIT = WIDTH * HEIGHT;

interface Tile {
  entry: SpaceEntry;
  rank: number;
  x: number;
  y: number;
  w: number;
  h: number;
  clip: string;
  color: string;
}

interface Area {
  entry: SpaceEntry;
  rank: number;
  area: number;
}

function worstRatio(row: Area[], side: number): number {
  let sum = 0;
  let max = 0;
  let min = Infinity;
  for (const item of row) {
    sum += item.area;
    if (item.area > max) max = item.area;
    if (item.area < min) min = item.area;
  }
  if (sum <= 0 || side <= 0 || min <= 0) return Infinity;
  const square = side * side;
  return Math.max((square * max) / (sum * sum), (sum * sum) / (square * min));
}

/** Squarified treemap: rows are filled along the shorter side while the worst
 * aspect ratio keeps improving, then committed as a strip. */
function squarify(areas: Area[], out: Tile[]): void {
  let queue = areas;
  let x = 0;
  let y = 0;
  let w = WIDTH;
  let h = HEIGHT;

  while (queue.length > 0 && w > 0.5 && h > 0.5) {
    const side = Math.min(w, h);
    const row: Area[] = [queue[0]];
    let index = 1;
    while (index < queue.length) {
      const candidate = [...row, queue[index]];
      if (worstRatio(candidate, side) > worstRatio(row, side)) break;
      row.push(queue[index]);
      index += 1;
    }

    const rowArea = row.reduce((sum, item) => sum + item.area, 0);
    const vertical = w >= h;
    const strip = vertical ? rowArea / h : rowArea / w;

    let cursor = vertical ? y : x;
    for (const item of row) {
      const span = strip > 0 ? item.area / strip : 0;
      const rx = vertical ? x : cursor;
      const ry = vertical ? cursor : y;
      const rw = vertical ? strip : span;
      const rh = vertical ? span : strip;
      out.push({
        entry: item.entry,
        rank: item.rank,
        x: rx + 0.75,
        y: ry + 0.75,
        w: Math.max(0.8, rw - 1.5),
        h: Math.max(0.8, rh - 1.5),
        clip: `tm-clip-${item.rank}`,
        color: `var(--c${(item.rank % 6) + 1})`,
      });
      cursor += span;
    }

    if (vertical) {
      x += strip;
      w -= strip;
    } else {
      y += strip;
      h -= strip;
    }
    queue = queue.slice(row.length);
  }
}

const tiles = computed<Tile[]>(() => {
  const shown = [...props.entries]
    .filter((entry) => entry.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_TILES);
  if (shown.length === 0) return [];
  const sum = shown.reduce((total, entry) => total + entry.size, 0);
  if (sum <= 0) return [];
  const areas: Area[] = shown.map((entry, rank) => ({ entry, rank, area: (entry.size / sum) * LIMIT }));
  const out: Tile[] = [];
  squarify(areas, out);
  return out;
});

function share(entry: SpaceEntry): number {
  return props.total > 0 ? (entry.size / props.total) * 100 : 0;
}

function shape(tile: Tile): { x: number; y: number; w: number; h: number } {
  return { x: tile.x, y: tile.y, w: tile.w, h: tile.h };
}

function clipRect(tile: Tile): { x: number; y: number; w: number; h: number } {
  return {
    x: tile.x + 3,
    y: tile.y + 2,
    w: Math.max(0, tile.w - 6),
    h: Math.max(0, tile.h - 4),
  };
}

function showName(tile: Tile): boolean {
  return tile.w >= 46 && tile.h >= 20;
}

function showSize(tile: Tile): boolean {
  return tile.w >= 62 && tile.h >= 36;
}

function onTile(tile: Tile): void {
  if (tile.entry.is_dir) emit("drill", tile.entry);
}
</script>

<template>
  <div class="treemap">
    <svg class="treemap-svg" :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img" :aria-label="$t('space.treemap')">
      <defs>
        <clipPath v-for="tile in tiles" :id="tile.clip" :key="`clip-${tile.entry.path}`">
          <rect v-bind="clipRect(tile)" />
        </clipPath>
      </defs>

      <g
        v-for="tile in tiles"
        :key="tile.entry.path"
        class="tile"
        :class="{ 'tile--dir': tile.entry.is_dir }"
        @click="onTile(tile)"
      >
        <title>{{ tile.entry.name }} · {{ formatBytes(tile.entry.size) }} · {{ formatPercent(share(tile.entry), 1) }}</title>
        <rect
          class="tile-fill"
          v-bind="shape(tile)"
          rx="2"
          :style="{ fill: tile.color, stroke: tile.color }"
        />
        <g v-if="showName(tile)" :clip-path="`url(#${tile.clip})`">
          <text class="tile-name" :x="tile.x + 6" :y="tile.y + 15">{{ tile.entry.name }}</text>
          <text v-if="showSize(tile)" class="tile-size" :x="tile.x + 6" :y="tile.y + 28">
            {{ formatBytes(tile.entry.size) }}
          </text>
        </g>
      </g>
    </svg>

    <div class="treemap-legend">
      <span>
        {{ $t("space.total") }}
        <span class="num legend-strong">{{ formatBytes(total) }}</span>
      </span>
      <span class="legend-dot" />
      <span class="num">{{ $t("space.entries", { n: entries.length }) }}</span>
    </div>
  </div>
</template>

<style scoped>
.treemap {
  padding: 10px 12px 9px;
}
.treemap-svg {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1000 / 200;
  overflow: hidden;
  border-radius: var(--dr-sm);
  background: var(--muted);
}
.tile-fill {
  fill-opacity: 0.85;
  stroke-width: 1;
  stroke-opacity: 0.2;
  transition: fill-opacity 120ms ease;
}
.tile:hover .tile-fill {
  fill-opacity: 1;
}
.tile--dir {
  cursor: pointer;
}
.tile-name,
.tile-size {
  fill: var(--background);
  font-family: var(--font-sans);
  pointer-events: none;
}
.tile-name {
  font-size: 11px;
  font-weight: 550;
}
.tile-size {
  font-size: 10px;
  opacity: 0.78;
}
.treemap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--muted-foreground);
}
.legend-strong {
  margin-left: 3px;
  color: var(--foreground);
}
.legend-dot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.5;
}
@media (prefers-reduced-motion: reduce) {
  .tile-fill {
    transition: none;
  }
}
</style>
