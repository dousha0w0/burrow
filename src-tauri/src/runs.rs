use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager, State};

use crate::process::{
    engine_for, pump_lines, spawn_reader, strip_ansi, wait_for_exit, AppState, RunExitEvent,
    RunHandle, RunLogEvent,
};

const LOG_EVENT: &str = "run:log";
const EXIT_EVENT: &str = "run:exit";

#[tauri::command]
pub async fn run_start(
    app: AppHandle,
    state: State<'_, AppState>,
    kind: String,
    preview: bool,
) -> Result<String, String> {
    let engine = engine_for(&state, &app).await?;

    let mut command = engine.command();
    match kind.as_str() {
        "clean" => {
            command.arg("clean");
            if preview {
                command.arg("--dry-run");
            }
        }
        "purge" => {
            command.arg("purge");
            // `--yes` is Mole's unattended confirmation for a real purge.
            command.arg(if preview { "--dry-run" } else { "--yes" });
        }
        other => return Err(format!("不支持的操作：{other}")),
    }

    let (shared, stdout, stderr) = spawn_reader(command).await?;
    let cancelled = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let id = format!(
        "{}-{}",
        kind,
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    );

    state.runs.lock().await.insert(
        id.clone(),
        RunHandle {
            child: shared.clone(),
            cancelled: cancelled.clone(),
        },
    );

    let log_app = app.clone();
    let log_run = id.clone();
    tauri::async_runtime::spawn(async move {
        let stdout_app = log_app.clone();
        let stdout_run = log_run.clone();
        let stdout_task = tauri::async_runtime::spawn(async move {
            pump_lines(stdout, move |line| {
                let _ = stdout_app.emit(
                    LOG_EVENT,
                    RunLogEvent {
                        run_id: stdout_run.clone(),
                        stream: "stdout",
                        line: strip_ansi(&line),
                    },
                );
            })
            .await;
        });
        let stderr_app = log_app.clone();
        let stderr_run = log_run.clone();
        let stderr_task = tauri::async_runtime::spawn(async move {
            pump_lines(stderr, move |line| {
                let _ = stderr_app.emit(
                    LOG_EVENT,
                    RunLogEvent {
                        run_id: stderr_run.clone(),
                        stream: "stderr",
                        line: strip_ansi(&line),
                    },
                );
            })
            .await;
        });

        let _ = stdout_task.await;
        let _ = stderr_task.await;
        let code = wait_for_exit(&shared).await;
        let was_cancelled = cancelled.load(Ordering::Relaxed);
        let _ = log_app.emit(
            EXIT_EVENT,
            RunExitEvent {
                run_id: log_run.clone(),
                code,
                cancelled: was_cancelled,
            },
        );
        log_app
            .state::<AppState>()
            .runs
            .lock()
            .await
            .remove(&log_run);
    });

    Ok(id)
}

#[tauri::command]
pub async fn run_cancel(state: State<'_, AppState>, run_id: String) -> Result<(), String> {
    let handle = state.runs.lock().await.get(&run_id).map(|handle| {
        handle.cancelled.store(true, Ordering::Relaxed);
        handle.child.clone()
    });
    match handle {
        Some(child) => {
            crate::process::kill_shared(&child).await;
            Ok(())
        }
        None => Err("运行已结束".to_string()),
    }
}
