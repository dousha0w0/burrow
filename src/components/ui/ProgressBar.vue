<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{ value: number; tone?: "accent" | "success" | "warning" | "destructive" | "muted"; height?: number }>(),
  { tone: "accent", height: 4 },
);

const width = computed(() => `${Math.min(100, Math.max(0, props.value))}%`);
const color = computed(() => {
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
  <div class="w-full overflow-hidden rounded-full bg-muted" :style="{ height: `${height}px` }">
    <div class="h-full rounded-full transition-[width] duration-500" :style="{ width, background: color }" />
  </div>
</template>
