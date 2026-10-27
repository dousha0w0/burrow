use std::time::Duration;

use serde_json::Value;
use tauri::{AppHandle, State};

use crate::process::{engine_for, read_json_command, AppState};

#[tauri::command]
pub async fn history(
    app: AppHandle,
    state: State<'_, AppState>,
    limit: u32,
) -> Result<Value, String> {
    let engine = engine_for(&state, &app).await?;
    let mut command = engine.command();
    command
        .arg("history")
        .arg("--json")
        .arg("--limit")
        .arg(limit.clamp(1, 200).to_string());
    read_json_command(command, Duration::from_secs(45)).await
}

/// `mo uninstall --list` is the engine's machine-readable app inventory.
#[tauri::command]
pub async fn apps_list(app: AppHandle, state: State<'_, AppState>) -> Result<Value, String> {
    let engine = engine_for(&state, &app).await?;
    let mut command = engine.command();
    command.arg("uninstall").arg("--list");
    read_json_command(command, Duration::from_secs(120)).await
}
