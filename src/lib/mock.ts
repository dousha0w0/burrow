/**
 * Deterministic fixtures for Vite dev and unit tests. Every shape here mirrors
 * what the Rust backend returns from the real Mole engine, so a view built
 * against mock mode runs unchanged against the CLI.
 */
import type {
  AppEntry,
  EngineInfo,
  HistoryReport,
  RunKind,
  SpaceEntry,
  SpaceReport,
  StatusSnapshot,
} from "@/types/mole";
import type { TerminalCommand } from "@/types/ui";
import { version as appVersion } from "../../package.json";
import { EVENTS, type RunExitEvent, type RunLogEvent } from "./bridge";
import type { EnvironmentReport, UpdateReport } from "@/types/diagnostics";

const HOME = "/Users/ray";
const GIB = 1024 ** 3;

const baseStatus = (): StatusSnapshot => ({
  collected_at: new Date().toISOString(),
  host: "burrow.local",
  platform: "darwin 27.0.1",
  uptime: "15h 6m",
  uptime_seconds: 54_360,
  procs: 812,
  hardware: {
    model: "MacBook Pro",
    cpu_model: "Apple M2 Max",
    total_ram: "32.0 GB",
    disk_size: "926.4 GB",
    os_version: "macOS 27.0.1",
    refresh_rate: "120",
  },
  health_score: 94,
  health_score_msg: "Excellent",
  cpu: {
    usage: 18.5,
    per_core: [36.4, 29.7, 19.8, 18.2, 0, 0, 0, 0, 59.3, 45.5, 0, 9.9],
    per_core_estimated: false,
    load1: 8.87,
    load5: 6.45,
    load15: 6.62,
    core_count: 12,
    logical_cpu: 12,
    p_core_count: 8,
    e_core_count: 4,
  },
  gpu: [{ name: "Apple M2 Max", usage: -1, core_count: 30, note: "sppci_vendor_Apple" }],
  memory: {
    used: 22.1 * GIB,
    total: 32 * GIB,
    available: 9.9 * GIB,
    used_percent: 64.3,
    swap_used: 156 * 1024 ** 2,
    swap_total: GIB,
    cached: 5.9 * GIB,
    pressure: "",
  },
  disks: [
    {
      mount: "/",
      device: "/dev/disk3s3s1",
      used: 388 * GIB,
      total: 926.4 * GIB,
      used_percent: 39,
      fstype: "apfs",
      external: false,
      smart_status: "verified",
      purgeable: 2.4 * GIB,
    },
  ],
  trash_size: 0,
  trash_approx: false,
  disk_io: { read_rate: 12.4, write_rate: 3.1 },
  network: [
    { name: "en0", rx_rate_mbs: 0.0145, tx_rate_mbs: 0.017, ip: "192.168.1.78" },
    { name: "utun0", rx_rate_mbs: 0, tx_rate_mbs: 0, ip: "" },
  ],
  network_history: { rx_history: [0.01], tx_history: [0.02] },
  proxy: { enabled: true, type: "TUN", host: "utun0+" },
  batteries: [{ percent: 84, status: "discharging", time_left: "3:53", health: "Good", cycle_count: 102, capacity: 94 }],
  thermal: {
    cpu_temp: 52,
    gpu_temp: 0,
    battery_temp: 34.9,
    fan_speed: 1200,
    fan_count: 2,
    system_power: 0,
    adapter_power: 0,
    battery_power: -10.3,
  },
  top_processes: [
    { pid: 49519, ppid: 1767, name: "Google Chrome Helper", command: "Google Chrome Helper", cpu: 21, memory: 1.8, memory_bytes: 620_888_064 },
    { pid: 28937, ppid: 1, name: "SeedmuxNative", command: "SeedmuxNative", cpu: 19.6, memory: 0.8, memory_bytes: 288_718_848 },
    { pid: 1290, ppid: 1, name: "WindowServer", command: "WindowServer", cpu: 12.4, memory: 1.2, memory_bytes: 402_653_184 },
    { pid: 20441, ppid: 1, name: "Cursor", command: "Cursor", cpu: 9.1, memory: 2.4, memory_bytes: 810_549_248 },
    { pid: 884, ppid: 1, name: "mds_stores", command: "mds_stores", cpu: 4.6, memory: 0.3, memory_bytes: 96_468_992 },
  ],
  zombie_count: 0,
});

let jitter = 0;

const overviewEntries: SpaceEntry[] = [
  { name: "Home", path: `${HOME}`, size: 129.3 * GIB, is_dir: true, scan_status: "complete" },
  { name: "Applications", path: "/Applications", size: 42.2 * GIB, is_dir: true, scan_status: "complete" },
  { name: "User Library", path: `${HOME}/Library`, size: 39.8 * GIB, is_dir: true, scan_status: "complete" },
  { name: "pnpm store", path: `${HOME}/Library/pnpm/store`, size: 8.0 * GIB, is_dir: true, scan_status: "complete", insight: true },
  { name: "uv Cache", path: `${HOME}/.cache/uv`, size: 2.9 * GIB, is_dir: true, scan_status: "complete", insight: true, cleanable: true },
  { name: "System Library", path: "/Library", size: 2.3 * GIB, is_dir: true, scan_status: "partial" },
  { name: "Docker Data", path: `${HOME}/Library/Containers/com.docker.docker/Data`, size: 1.8 * GIB, is_dir: true, scan_status: "complete", insight: true, cleanable: true },
  { name: "JetBrains Cache", path: `${HOME}/Library/Caches/JetBrains`, size: 1.3 * GIB, is_dir: true, scan_status: "complete", insight: true, cleanable: true },
  { name: "System Logs", path: `${HOME}/Library/Logs`, size: 0.44 * GIB, is_dir: true, scan_status: "complete", insight: true, cleanable: true },
  { name: "Xcode Simulators", path: `${HOME}/Library/Developer/CoreSimulator/Devices`, size: 0.19 * GIB, is_dir: true, scan_status: "complete", insight: true },
];

const childrenByDir = (path: string): SpaceEntry[] => {
  const seed = path.length % 5;
  const names = ["Caches", "Application Support", "Containers", "Logs", "Preferences", "Saved Application State", "WebKit", "Developer"];
  return names.map((name, index) => ({
    name,
    path: `${path}/${name}`,
    size: (seed + 1) * (index + 3) * 0.42 * GIB,
    is_dir: true,
    scan_status: "complete",
    insight: index < 2,
    cleanable: index < 2,
  }));
};

const sessions: HistoryReport["sessions"] = [
  {
    command: "clean",
    run_id: "20261026090230-82118-9056-9536",
    attribution: "run",
    started_at: "2026-10-26 09:02:30",
    ended_at: "2026-10-26 09:05:17",
    items: 442,
    size: "14.24GB",
    operation_count: 986,
    failed_tasks: 0,
    actions: { removed: 800, trashed: 0, skipped: 186, failed: 0, rebuilt: 0, other: 0 },
  },
  {
    command: "clean-dry-run",
    run_id: "20261027092511-50511-26671-11395",
    attribution: "run",
    started_at: "2026-10-27 09:25:11",
    ended_at: "2026-10-27 09:26:02",
    items: 356,
    size: "5.01GB",
    operation_count: 112,
    failed_tasks: 0,
    actions: { removed: 0, trashed: 0, skipped: 0, failed: 0, rebuilt: 0, other: 0 },
  },
  {
    command: "purge-dry-run",
    run_id: "20261027092656-66520-7331-2974",
    attribution: "run",
    started_at: "2026-10-27 09:26:56",
    ended_at: "2026-10-27 09:27:29",
    items: 117,
    size: "7.85GB",
    operation_count: 0,
    failed_tasks: 0,
    actions: { removed: 0, trashed: 0, skipped: 0, failed: 0, rebuilt: 0, other: 0 },
  },
  {
    command: "uninstall",
    run_id: "",
    attribution: "command",
    started_at: "2026-10-13 21:27:21",
    ended_at: "2026-10-13 21:27:44",
    items: 1,
    size: "154.8MB",
    operation_count: 7,
    failed_tasks: 0,
    actions: { removed: 0, trashed: 4, skipped: 3, failed: 0, rebuilt: 0, other: 0 },
  },
];

const apps: AppEntry[] = [
  ["Cursor", "com.todesktop.230313mzl4w4u92", "App"],
  ["Docker", "com.docker.docker", "App"],
  ["Ghostty", "com.mitchellh.ghostty", "Homebrew"],
  ["Obsidian", "md.obsidian", "App"],
  ["IINA", "com.colliderli.iina", "App"],
  ["Keka", "com.aone.keka", "App"],
  ["Parallels Desktop", "com.parallels.desktop.console", "App"],
  ["QuickRecorder", "com.lihaoyun6.QuickRecorder", "App"],
  ["calibre", "net.kovidgoyal.calibre", "Homebrew"],
  ["AeroSpace", "bobko.aerospace", "Homebrew"],
  ["Long Path Example", "com.example.long-path", "App"],
].map(([name, bundle, source]) => ({
  name,
  bundle_id: bundle,
  source,
  uninstall_name: source === "Homebrew" ? name.toLowerCase() : name,
  path: name === "Long Path Example"
    ? "/Users/ray/Library/Application Support/Some Very Long Vendor Name/Some Very Long Application Name.app"
    : `/Applications/${name}.app`,
  size: "--",
}));

type Handler = (payload: unknown) => void;
const handlers = new Map<string, Set<Handler>>();
let statusTimer: ReturnType<typeof setInterval> | undefined;
const timers = new Map<string, ReturnType<typeof setTimeout>[]>();

function emit(event: string, payload: unknown): void {
  handlers.get(event)?.forEach((handler) => handler(payload));
}

export function mockListen<T>(event: string, handler: (payload: T) => void): Promise<() => void> {
  const set = handlers.get(event) ?? new Set<Handler>();
  set.add(handler as Handler);
  handlers.set(event, set);
  return Promise.resolve(() => set.delete(handler as Handler));
}

const sleepLines = (runId: string, lines: string[], done: () => void, delay = 90) => {
  let elapsed = 0;
  lines.forEach((line) => {
    const timer = setTimeout(() => emit(EVENTS.runLog, { runId, stream: "stdout", line } satisfies RunLogEvent), elapsed);
    elapsed += delay;
    timers.set(runId, [...(timers.get(runId) ?? []), timer]);
  });
  const final = setTimeout(done, elapsed + delay);
  timers.set(runId, [...(timers.get(runId) ?? []), final]);
};

const cleanPreviewLines = [
  "➤ Apps & utilities",
  "  → Zsh completion cache · 57KB dry",
  "  → Alfred cache · 2 items, 0B dry",
  "➤ Virtualization",
  "  ✓ Nothing to clean",
  "➤ Application Support",
  "  → Application Support logs/caches · 32.3MB dry",
  "➤ Large files",
  "  ⊙ pnpm store · 7.99GB · ~/Library/pnpm/store",
  "  ⊙ Hugging Face cache · 2.72GB · ~/.cache/huggingface",
  "",
  "======================================================================",
  "Dry run complete - no changes made",
  "Potential space: 5.01GB | Items: 356 | Categories: 6",
  "Detailed file list: /Users/ray/.config/mole/clean-list.txt",
];

const cleanRealLines = [
  "➤ Apps & utilities",
  "  ✓ Zsh completion cache · 57KB",
  "  ✓ Alfred cache · 2 items, 0B",
  "➤ Application Support",
  "  ✓ Application Support logs/caches · 32.3MB",
  "Running in non-interactive mode",
  "  ◦ System-level cleanup skipped, requires sudo",
  "",
  "======================================================================",
  "Tracked cleanup: 4.62GB | Items cleaned: 512",
  "Free space: 606.4 GB (+4.62 GB)",
];

const purgePreviewLines = [
  "✓ [DRY RUN] ~/Developer/app/__pycache__, 37KB",
  "✓ [DRY RUN] ~/Developer/app/build, 1.2GB",
  "======================================================================",
  "Dry run complete - no changes made",
  "Would free approximately: 7.85GB | Items: 117 | Free: 606.77GB",
];

const purgeRealLines = [
  "✓ ~/Developer/app/__pycache__ removed",
  "✓ ~/Developer/app/build removed",
  "======================================================================",
  "Estimated space freed: 7.85GB | Items: 117",
];

export const mockApi = {
  engineInfo(): Promise<EngineInfo> {
    return Promise.resolve({
      root: "/mock/engine",
      entry: "/mock/engine/mo",
      version: "1.64.0",
      source: "bundled",
      platform: "darwin 27.0.1",
      arch: "arm64",
    });
  },
  statusOnce(): Promise<StatusSnapshot> {
    return Promise.resolve(baseStatus());
  },
  statusWatchStart(intervalSecs: number): Promise<void> {
    clearInterval(statusTimer);
    statusTimer = setInterval(() => {
      jitter += 1;
      const next = baseStatus();
      next.cpu.usage = 12 + ((jitter * 7) % 34);
      next.memory.used_percent = 58 + ((jitter * 3) % 12);
      next.disk_io.read_rate = 4 + ((jitter * 11) % 40);
      next.disk_io.write_rate = 1 + ((jitter * 5) % 18);
      next.network[0].rx_rate_mbs = ((jitter * 13) % 90) / 100;
      next.network[0].tx_rate_mbs = ((jitter * 7) % 60) / 100;
      next.health_score = 88 + (jitter % 8);
      emit(EVENTS.status, next);
    }, Math.max(1, intervalSecs) * 1000);
    return Promise.resolve();
  },
  statusWatchStop(): Promise<void> {
    clearInterval(statusTimer);
    statusTimer = undefined;
    return Promise.resolve();
  },
  analyze(path: string | null): Promise<SpaceReport> {
    if (!path || path === "/") {
      return Promise.resolve({ scan_status: "partial", path: "/", overview: true, entries: overviewEntries, total_size: 228.19 * GIB });
    }
    return Promise.resolve({ scan_status: "complete", path, overview: false, entries: childrenByDir(path), total_size: 18 * GIB });
  },
  analyzeCancel(): Promise<void> {
    return Promise.resolve();
  },
  history(limit: number): Promise<HistoryReport> {
    return Promise.resolve({
      logs: {
        operations: `${HOME}/Library/Logs/mole/operations.log`,
        deletions: `${HOME}/Library/Logs/mole/deletions.log`,
      },
      limit,
      sessions: sessions.slice(0, limit),
    });
  },
  appsList(): Promise<AppEntry[]> {
    return Promise.resolve(apps);
  },
  runStart(kind: RunKind, preview: boolean): Promise<string> {
    const runId = `mock-${kind}-${Date.now()}`;
    const lines = kind === "clean" ? (preview ? cleanPreviewLines : cleanRealLines) : preview ? purgePreviewLines : purgeRealLines;
    sleepLines(runId, lines, () => emit(EVENTS.runExit, { runId, code: 0, cancelled: false } satisfies RunExitEvent));
    return Promise.resolve(runId);
  },
  runCancel(runId: string): Promise<void> {
    (timers.get(runId) ?? []).forEach(clearTimeout);
    emit(EVENTS.runExit, { runId, code: null, cancelled: true } satisfies RunExitEvent);
    return Promise.resolve();
  },
  revealPath(_path: string): Promise<void> {
    return Promise.resolve();
  },
  terminalRun(_kind: TerminalCommand, _target?: string): Promise<void> {
    return Promise.resolve();
  },
  environmentReport(): Promise<EnvironmentReport> {
    return Promise.resolve({
      install: { appPath: "/Applications/Burrow.app", inApplications: true, quarantined: false },
      engine: {
        ok: true,
        source: "bundled",
        version: "1.64.0",
        root: "/mock/engine",
        entry: "/mock/engine/mo",
        checks: [
          { id: "entry", ok: true, detail: "/mock/engine/mo" },
          { id: "library", ok: true, detail: "/mock/engine/lib" },
          { id: "binaries", ok: true, detail: "/mock/engine/bin" },
          { id: "version", ok: true, detail: "1.64.0" },
          { id: "runner", ok: true, detail: null },
        ],
      },
      permissions: {
        fullDiskAccess: false,
        probes: [
          { path: "~/Library/Application Support/com.apple.TCC/TCC.db", readable: false },
          { path: "/Library/Application Support/com.apple.TCC/TCC.db", readable: false },
          { path: "~/Library/Mail", readable: false },
          { path: "~/Library/Safari", readable: false },
        ],
      },
    });
  },
  checkUpdates(): Promise<UpdateReport> {
    return Promise.resolve({
      engine: {
        current: "1.64.0",
        latest: "1.64.0",
        updateAvailable: false,
        url: "https://github.com/tw93/Mole/releases",
        error: null,
      },
      app: {
        current: appVersion,
        latest: appVersion,
        updateAvailable: false,
        url: "https://github.com/dousha0w0/burrow/releases",
        error: null,
      },
      checkedAt: Math.floor(Date.now() / 1000),
    });
  },
};
