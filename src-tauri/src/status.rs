use std::time::Duration;

use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::engine::EngineInfo;
use crate::process::{
    engine_for, kill_shared, pump_lines, read_all, read_json_command, spawn_reader, AppState,
};

const STATUS_EVENT: &str = "status:snapshot";

#[tauri::command]
pub async fn engine_info(app: AppHandle, state: State<'_, AppState>) -> Result<EngineInfo, String> {
    Ok(engine_for(&state, &app).await?.info())
}

#[tauri::command]
pub async fn status_once(app: AppHandle, state: State<'_, AppState>) -> Result<Value, String> {
    let engine = engine_for(&state, &app).await?;
    let mut command = engine.command();
    command.arg("status").arg("--json");
    read_json_command(command, Duration::from_secs(40)).await
}

#[tauri::command]
pub async fn status_watch_start(
    app: AppHandle,
    state: State<'_, AppState>,
    interval_secs: u64,
) -> Result<(), String> {
    let engine = engine_for(&state, &app).await?;
    if let Some(previous) = state.watch.lock().await.take() {
        kill_shared(&previous).await;
    }

    let seconds = interval_secs.clamp(1, 30);
    let mut command = engine.command();
    command
        .arg("status")
        .arg("--watch")
        .arg("--interval")
        .arg(format!("{seconds}s"));
    let (shared, stdout, stderr) = spawn_reader(command).await?;
    *state.watch.lock().await = Some(shared.clone());

    tauri::async_runtime::spawn(async move {
        tauri::async_runtime::spawn(async move {
            let _ = read_all(stderr).await;
        });
        let emitter = app.clone();
        pump_lines(stdout, move |line| {
            if let Ok(value) = serde_json::from_str::<Value>(line.trim()) {
                let _ = emitter.emit(STATUS_EVENT, value);
            }
        })
        .await;
        let mut guard = shared.lock().await;
        if let Some(mut child) = guard.take() {
            let _ = child.wait().await;
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn status_watch_stop(state: State<'_, AppState>) -> Result<(), String> {
    if let Some(shared) = state.watch.lock().await.take() {
        kill_shared(&shared).await;
    }
    Ok(())
}
