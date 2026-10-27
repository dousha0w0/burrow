import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api, onRunExit, onRunLog } from "@/lib/bridge";
import { stripAnsi, summarizeRun } from "@/lib/parse-run";
import type { LogLine, RunKind, RunState } from "@/types/mole";

const MAX_LINES = 4000;
const MAX_RUNS = 12;

/**
 * One place that owns engine runs, so the Clean view can be unmounted while a
 * long purge keeps streaming and its log survives navigation.
 */
export const useRunsStore = defineStore("runs", () => {
  const runs = ref<RunState[]>([]);
  const initialized = ref(false);

  async function init(): Promise<void> {
    if (initialized.value) return;
    initialized.value = true;
    await onRunLog((event) => {
      const run = runs.value.find((item) => item.id === event.runId);
      if (!run) return;
      const text = stripAnsi(event.line);
      const last = run.lines[run.lines.length - 1];
      // Mole redraws spinners with bare `\r`; keep the final state of a line.
      if (last && event.stream === last.stream && text.length === 0) return;
      run.lines.push({ n: run.lines.length + 1, stream: event.stream, text });
      if (run.lines.length > MAX_LINES) run.lines.splice(0, run.lines.length - MAX_LINES);
    });
    await onRunExit((event) => {
      const run = runs.value.find((item) => item.id === event.runId);
      if (!run) return;
      finish(run, event.code, event.cancelled);
    });
  }

  function finish(run: RunState, code: number | null, cancelled: boolean): void {
    if (run.status !== "running") return;
    run.code = code;
    run.endedAt = Date.now();
    run.status = cancelled ? "cancelled" : code === 0 ? "succeeded" : "failed";
    const text = run.lines.map((line) => line.text).join("\n");
    run.summary = summarizeRun(run.kind, run.preview, text);
    if (run.status === "failed" && !run.summary.size) {
      const tail = run.lines.slice(-8).map((line) => line.text).join("\n").trim();
      run.error = tail || `引擎以状态码 ${code ?? "?"} 退出`;
    }
  }

  async function start(kind: RunKind, preview: boolean): Promise<string> {
    await init();
    const id = await api.runStart(kind, preview);
    const created: RunState = {
      id,
      kind,
      preview,
      status: "running",
      code: null,
      startedAt: Date.now(),
      endedAt: null,
      lines: [],
      summary: null,
      error: null,
    };
    runs.value = [created, ...runs.value].slice(0, MAX_RUNS);
    return id;
  }

  async function cancel(id: string): Promise<void> {
    const run = runs.value.find((item) => item.id === id);
    if (!run || run.status !== "running") return;
    await api.runCancel(id);
    const text = run.lines.map((line) => line.text).join("\n");
    run.summary = summarizeRun(run.kind, run.preview, text);
    run.status = "cancelled";
    run.endedAt = Date.now();
  }

  const active = computed(() => runs.value.find((run) => run.status === "running") ?? null);
  const latestFor = (kind: RunKind): RunState | null => runs.value.find((run) => run.kind === kind) ?? null;
  const lastResult = computed(() => runs.value.find((run) => run.status === "succeeded" && run.summary) ?? null);

  function clear(): void {
    runs.value = runs.value.filter((run) => run.status === "running");
  }

  return { runs, active, lastResult, init, start, cancel, clear, latestFor };
});
