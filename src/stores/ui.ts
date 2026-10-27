import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { applyAppearance, loadPreferences, savePreferences, watchSystemTheme, type UiPreferences } from "@/lib/prefs";
import type { MenuItem, MenuState, Toast, ViewId } from "@/types/ui";

const MENU_WIDTH = 216;
const MENU_ROW = 28;

export const useUiStore = defineStore("ui", () => {
  const prefs = ref<UiPreferences>(loadPreferences());
  const dark = ref(applyAppearance(prefs.value));
  const activeView = ref<ViewId>("overview");
  const toasts = ref<Toast[]>([]);
  const menu = ref<MenuState | null>(null);
  const refreshTick = ref(0);
  let toastSequence = 0;

  function setPrefs(patch: Partial<UiPreferences>): void {
    prefs.value = { ...prefs.value, ...patch };
    savePreferences(prefs.value);
    dark.value = applyAppearance(prefs.value);
  }

  function toast(message: string, kind: Toast["kind"] = "info", timeout = 3600): number {
    const id = ++toastSequence;
    toasts.value = [...toasts.value, { id, message, kind }];
    if (timeout > 0) window.setTimeout(() => dismissToast(id), timeout);
    return id;
  }

  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((item) => item.id !== id);
  }

  function openMenu(event: MouseEvent, items: MenuItem[]): void {
    const x = Math.min(event.clientX, window.innerWidth - MENU_WIDTH - 8);
    const height = items.reduce((sum, item) => sum + (item.separator ? 9 : MENU_ROW), 8);
    const y = Math.min(event.clientY, window.innerHeight - height - 8);
    menu.value = { x: Math.max(8, x), y: Math.max(8, y), items };
  }

  function closeMenu(): void {
    menu.value = null;
  }

  function setView(view: ViewId): void {
    activeView.value = view;
  }

  function refresh(): void {
    refreshTick.value += 1;
  }

  function setSidebarWidth(width: number): void {
    setPrefs({ sidebarWidth: width });
  }

  watch(
    () => prefs.value,
    (value) => {
      dark.value = applyAppearance(value);
    },
    { deep: true },
  );

  watchSystemTheme(() => {
    if (prefs.value.themeMode === "system") dark.value = applyAppearance(prefs.value);
  });

  return {
    prefs,
    dark,
    activeView,
    toasts,
    menu,
    refreshTick,
    setPrefs,
    toast,
    dismissToast,
    openMenu,
    closeMenu,
    setView,
    refresh,
    setSidebarWidth,
  };
});
