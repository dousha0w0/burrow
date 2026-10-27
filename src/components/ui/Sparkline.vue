<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    values: number[];
    height?: number;
    /** Fixed ceiling; omitted means the series' own max (nice for load). */
    max?: number;
    tone?: "accent" | "success" | "warning" | "destructive" | "muted";
    fill?: boolean;
    /** Pad the series to this many points so the line grows from the left. */
    capacity?: number;
  }>(),
  { height: 34, tone: "accent", fill: true, capacity: 60 },
);

const WIDTH = 120;

const points = computed(() => {
  const series = [...props.values];
  while (series.length < props.capacity) series.unshift(0);
  const values = series.slice(-props.capacity);
  const ceiling = Math.max(props.max ?? 0, ...values, 1);
  return values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * WIDTH;
    const y = props.height - (Math.min(value, ceiling) / ceiling) * (props.height - 2) - 1;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
});

const line = computed(() => points.value.join(" "));
const area = computed(() => `0,${props.height} ${line.value} ${WIDTH},${props.height}`);
const stroke = computed(() => {
  switch (props.tone) {
    case "success":
      return "var(--success)";
    case "warning":
      return "var(--warning)";
    case "destructive":
      return "var(--destructive)";
    case "muted":
      return "var(--muted-foreground)";
    default:
      return "var(--c1)";
  }
});
</script>

<template>
  <svg :viewBox="`0 0 ${WIDTH} ${height}`" :height="height" preserveAspectRatio="none" class="w-full" aria-hidden="true">
    <polygon v-if="fill && points.length > 1" :points="area" :fill="stroke" opacity="0.12" />
    <polyline
      :points="line"
      fill="none"
      :stroke="stroke"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
