<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 20 });
</script>

<template>
  <!-- A burrow mouth: ground line, mound, tunnel arch. -->
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
    <path
      d="M2.6 18.4h18.8M5.4 18.4a6.6 6.6 0 0 1 13.2 0"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
    />
    <path d="M9.4 18.4a2.6 2.6 0 0 1 5.2 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
    <circle cx="12" cy="14.6" r="1.05" fill="currentColor" />
  </svg>
</template>
