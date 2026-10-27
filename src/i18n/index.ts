import { createI18n } from "vue-i18n";
import commonZh from "./locales/common.zh-CN";
import commonEn from "./locales/common.en";
import overviewZh from "./locales/overview.zh-CN";
import overviewEn from "./locales/overview.en";
import spaceZh from "./locales/space.zh-CN";
import spaceEn from "./locales/space.en";
import cleanZh from "./locales/clean.zh-CN";
import cleanEn from "./locales/clean.en";
import historyZh from "./locales/history.zh-CN";
import historyEn from "./locales/history.en";
import appsZh from "./locales/apps.zh-CN";
import appsEn from "./locales/apps.en";
import settingsZh from "./locales/settings.zh-CN";
import settingsEn from "./locales/settings.en";

export type Locale = "zh-CN" | "en";
export const LOCALES: { value: Locale; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
];

const STORAGE_KEY = "burrow.locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en") return saved;
  } catch {
    // storage unavailable
  }
  return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: "en",
  messages: {
    "zh-CN": {
      ...commonZh,
      settings: { ...commonZh.settings, ...settingsZh },
      overview: overviewZh,
      space: spaceZh,
      clean: cleanZh,
      history: historyZh,
      apps: appsZh,
    },
    en: {
      ...commonEn,
      settings: { ...commonEn.settings, ...settingsEn },
      overview: overviewEn,
      space: spaceEn,
      clean: cleanEn,
      history: historyEn,
      apps: appsEn,
    },
  },
});

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale;
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore storage failures
  }
}

export function currentLocale(): Locale {
  return i18n.global.locale.value as Locale;
}
