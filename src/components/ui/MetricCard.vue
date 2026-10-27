<script setup lang="ts">
import { computed } from "vue";
import Icon from "./Icon.vue";
import ProgressBar from "./ProgressBar.vue";

const props = withDefaults(
  defineProps<{
    icon: string;
    label: string;
    value: string;
    sub?: string;
    percent?: number | null;
    tone?: "accent" | "success" | "warning" | "destructive" | "muted";
  }>(),
  { tone: "accent", percent: null },
);

const toneClass = computed(() => {
  switch (props.tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "destructive":
      return "text-destructive";
    case "muted":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
});
</script>

<template>
  <div class="panel p-3">
    <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Icon :name="icon" :size="12" />
      <span>{{ label }}</span>
    </div>
    <div class="mt-2 flex items-baseline gap-1.5">
      <span :class="['num text-[19px] font-semibold leading-none tracking-tight', toneClass]">{{ value }}</span>
      <span v-if="sub" class="truncate text-[11px] text-muted-foreground">{{ sub }}</span>
    </div>
    <div v-if="percent !== null" class="mt-2.5">
      <ProgressBar :value="percent" :tone="tone" />
    </div>
    <slot />
  </div>
</template>
