import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { i18n } from "./i18n";
import { api } from "./lib/bridge";
import "./styles/globals.css";

const report = (level: string, message: string) => {
  void api.logMessage(level, message).catch(() => {});
};

window.addEventListener("error", (event) => {
  report("error", `${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`);
});
window.addEventListener("unhandledrejection", (event) => {
  report("error", `unhandled rejection: ${String(event.reason)}`);
});

report("info", `burrow booting (${navigator.userAgent})`);

createApp(App).use(createPinia()).use(i18n).mount("#app");

// If the shell fails before it can ask for the window, show it anyway.
window.setTimeout(() => {
  void api.uiReady().catch(() => {});
}, 4000);

report("info", "vue mounted");
