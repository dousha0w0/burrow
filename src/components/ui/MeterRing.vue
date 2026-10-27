<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ value: number; size?: number; stroke?: number; label?: string }>(), {
  size: 92,
  stroke: 7,
  label: "",
});

const radius = computed(() => (props.size - props.stroke) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const clamped = computed(() => Math.min(100, Math.max(0, props.value)));
const dash = computed(() => `${(clamped.value / 100) * circumference.value} ${circumference.value}`);
const tone = computed(() => (clamped.value >= 80 ? "var(--success)" : clamped.value >= 55 ? "var(--warning)" : "var(--destructive)"));
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90" aria-hidden="true">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="var(--border)"
        :stroke-width="stroke"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="tone"
        :stroke-width="stroke"
        :stroke-dasharray="dash"
        stroke-linecap="round"
        class="transition-[stroke-dasharray] duration-500"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="num text-[20px] font-semibold leading-none">{{ Math.round(value) }}</span>
      <span v-if="label" class="mt-1 text-[10px] text-muted-foreground">{{ label }}</span>
    </div>
  </div>
</template>
