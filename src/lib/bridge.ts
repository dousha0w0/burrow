import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  AppEntry,
  EngineInfo,
  HistoryReport,
  RunKind,
  SpaceReport,
  StatusSnapshot,
} from "@/types/mole";
import type { EnvironmentReport, UpdateReport } from "@/types/diagnostics";
import type { TerminalCommand } from "@/types/ui";
import { mockApi, mockListen } from "./mock";

/** The webview runs under Tauri in production; Vite dev without Tauri is mock mode. */
export const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export const IS_MOCK = !IS_TAURI;

export const EVENTS = {
  status: "status:snapshot",
  runLog: "run:log",
  runExit: "run:exit",
} as const;

export interface RunLogEvent {
  runId: string;
  stream: "stdout" | "stderr";
  line: string;
}

export interface RunExitEvent {
  runId: string;
  code: number | null;
  cancelled: boolean;
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args);
}

export const api = {
  engineInfo(): Promise<EngineInfo> {
    return IS_MOCK ? mockApi.engineInfo() : call<EngineInfo>("engine_info");
  },
  statusOnce(): Promise<StatusSnapshot> {
    return IS_MOCK ? mockApi.statusOnce() : call<StatusSnapshot>("status_once");
  },
  statusWatchStart(intervalSecs: number): Promise<void> {
    return IS_MOCK ? mockApi.statusWatchStart(intervalSecs) : call<void>("status_watch_start", { intervalSecs });
  },
  statusWatchStop(): Promise<void> {
    return IS_MOCK ? mockApi.statusWatchStop() : call<void>("status_watch_stop");
  },
  analyze(path: string | null): Promise<SpaceReport> {
    return IS_MOCK ? mockApi.analyze(path) : call<SpaceReport>("analyze", { path });
  },
  analyzeCancel(): Promise<void> {
    return IS_MOCK ? mockApi.analyzeCancel() : call<void>("analyze_cancel");
  },
  history(limit = 60): Promise<HistoryReport> {
    return IS_MOCK ? mockApi.history(limit) : call<HistoryReport>("history", { limit });
  },
  appsList(): Promise<AppEntry[]> {
    return IS_MOCK ? mockApi.appsList() : call<AppEntry[]>("apps_list");
  },
  runStart(kind: RunKind, preview: boolean): Promise<string> {
    return IS_MOCK ? mockApi.runStart(kind, preview) : call<string>("run_start", { kind, preview });
  },
  runCancel(runId: string): Promise<void> {
    return IS_MOCK ? mockApi.runCancel(runId) : call<void>("run_cancel", { runId });
  },
  revealPath(path: string): Promise<void> {
    return IS_MOCK ? mockApi.revealPath(path) : call<void>("reveal_path", { path });
  },
  terminalRun(kind: TerminalCommand, target?: string): Promise<void> {
    return IS_MOCK ? mockApi.terminalRun(kind, target) : call<void>("terminal_run", { kind, target: target ?? null });
  },
  openExternal(url: string): Promise<void> {
    return IS_MOCK ? Promise.resolve() : call<void>("open_external", { url });
  },
  logMessage(level: string, message: string): Promise<void> {
    return IS_MOCK ? Promise.resolve() : call<void>("log_message", { level, message });
  },
  uiReady(): Promise<void> {
    return IS_MOCK ? Promise.resolve() : call<void>("ui_ready");
  },
  environmentReport(): Promise<EnvironmentReport> {
    return IS_MOCK ? mockApi.environmentReport() : call<EnvironmentReport>("environment_report");
  },
  checkUpdates(): Promise<UpdateReport> {
    return IS_MOCK ? mockApi.checkUpdates() : call<UpdateReport>("check_updates");
  },
  openPrivacySettings(): Promise<void> {
    return IS_MOCK ? Promise.resolve() : call<void>("open_privacy_settings");
  },
};

export function onStatus(handler: (snapshot: StatusSnapshot) => void): Promise<UnlistenFn> {
  return IS_MOCK ? mockListen<StatusSnapshot>(EVENTS.status, handler) : listen<StatusSnapshot>(EVENTS.status, (event) => handler(event.payload));
}

export function onRunLog(handler: (event: RunLogEvent) => void): Promise<UnlistenFn> {
  return IS_MOCK ? mockListen<RunLogEvent>(EVENTS.runLog, handler) : listen<RunLogEvent>(EVENTS.runLog, (event) => handler(event.payload));
}

export function onRunExit(handler: (event: RunExitEvent) => void): Promise<UnlistenFn> {
  return IS_MOCK ? mockListen<RunExitEvent>(EVENTS.runExit, handler) : listen<RunExitEvent>(EVENTS.runExit, (event) => handler(event.payload));
}
