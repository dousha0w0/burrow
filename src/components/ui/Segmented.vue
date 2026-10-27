<script setup lang="ts">
export interface SegmentOption {
  value: string;
  label: string;
}

withDefaults(defineProps<{ modelValue: string; options: SegmentOption[]; compact?: boolean }>(), { compact: false });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div
    class="inline-flex items-center gap-0.5 rounded-[7px] border border-border bg-muted p-0.5"
    role="radiogroup"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="option.value === modelValue"
      :class="[
        'select-none rounded-[5px] transition-colors',
        compact ? 'h-6 px-2 text-[11.5px]' : 'h-7 px-2.5 text-[12px]',
        option.value === modelValue
          ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0_/_0.08)]'
          : 'text-muted-foreground hover:text-foreground',
      ]"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
