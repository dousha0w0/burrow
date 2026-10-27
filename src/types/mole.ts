/** Wire types for the Mole engine. Field names mirror the CLI's JSON exactly. */

export type EngineSource = "bundled" | "system";

export interface EngineInfo {
  root: string;
  entry: string;
  version: string;
  source: EngineSource;
  platform: string;
  arch: string;
}

export interface StatusHardware {
  model: string;
  cpu_model: string;
  total_ram: string;
  disk_size: string;
  os_version: string;
  refresh_rate: string;
}

export interface StatusCpu {
  usage: number;
  per_core: number[];
  per_core_estimated: boolean;
  load1: number;
  load5: number;
  load15: number;
  core_count: number;
  logical_cpu: number;
  p_core_count: number;
  e_core_count: number;
}

export interface StatusGpu {
  name: string;
  usage: number;
  memory_used?: number;
  memory_total?: number;
  core_count: number;
  note?: string;
}

export interface StatusMemory {
  used: number;
  total: number;
  available: number;
  used_percent: number;
  swap_used: number;
  swap_total: number;
  cached: number;
  pressure: string;
}

export interface StatusDisk {
  mount: string;
  device: string;
  used: number;
  total: number;
  used_percent: number;
  fstype: string;
  external: boolean;
  smart_status: string;
  purgeable?: number;
}

export interface StatusNetwork {
  name: string;
  rx_rate_mbs: number;
  tx_rate_mbs: number;
  ip: string;
}

export interface StatusBattery {
  percent: number;
  status: string;
  time_left: string;
  health: string;
  cycle_count: number;
  capacity: number;
}

export interface StatusThermal {
  cpu_temp: number;
  gpu_temp: number;
  battery_temp: number;
  fan_speed: number;
  fan_count: number;
  system_power: number;
  adapter_power: number;
  battery_power: number;
}

export interface StatusProcess {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  cpu: number;
  memory: number;
  memory_bytes: number;
}

export interface StatusProxy {
  enabled: boolean;
  type: string;
  host: string;
}

export interface StatusSnapshot {
  collected_at: string;
  host: string;
  platform: string;
  uptime: string;
  uptime_seconds: number;
  procs: number;
  hardware: StatusHardware;
  health_score: number;
  health_score_msg: string;
  cpu: StatusCpu;
  gpu: StatusGpu[];
  memory: StatusMemory;
  disks: StatusDisk[];
  trash_size: number;
  trash_approx: boolean;
  disk_io: { read_rate: number; write_rate: number };
  network: StatusNetwork[];
  network_history: { rx_history: number[]; tx_history: number[] };
  proxy?: StatusProxy;
  batteries: StatusBattery[];
  thermal: StatusThermal;
  top_processes: StatusProcess[];
  process_stale?: boolean;
  zombie_count: number;
}

export interface SpaceEntry {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  scan_status: "complete" | "partial" | string;
  insight?: boolean;
  cleanable?: boolean;
}

export interface SpaceReport {
  scan_status: "complete" | "partial" | string;
  path: string;
  overview: boolean;
  entries: SpaceEntry[];
  total_size?: number;
}

export interface HistorySession {
  command: string;
  run_id: string;
  attribution: string;
  started_at: string;
  ended_at: string;
  items: number;
  size: string;
  operation_count: number;
  failed_tasks: number;
  actions: {
    removed: number;
    trashed: number;
    skipped: number;
    failed: number;
    rebuilt: number;
    other: number;
  };
}

export interface HistoryReport {
  logs: { operations: string; deletions: string };
  limit: number;
  sessions: HistorySession[];
}

export interface AppEntry {
  name: string;
  bundle_id: string;
  source: string;
  uninstall_name: string;
  path: string;
  size: string;
}

/** `clean` frees user-level junk; `purge` removes project build artifacts. */
export type RunKind = "clean" | "purge";

export type RunStatus = "running" | "succeeded" | "failed" | "cancelled";

export interface LogLine {
  n: number;
  stream: "stdout" | "stderr";
  text: string;
}

export interface RunSummary {
  /** Human size as printed by the engine, e.g. `5.01GB` or `7.85GB`. */
  size: string | null;
  items: number | null;
  categories: number | null;
  /** `true` while the number is a preview (`--dry-run`). */
  preview: boolean;
  /** Extra engine lines worth surfacing (free space, errors). */
  notes: string[];
}

export interface RunState {
  id: string;
  kind: RunKind;
  preview: boolean;
  status: RunStatus;
  code: number | null;
  startedAt: number;
  endedAt: number | null;
  lines: LogLine[];
  summary: RunSummary | null;
  error: string | null;
}
