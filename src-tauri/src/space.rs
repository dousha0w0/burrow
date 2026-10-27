use std::sync::Arc;

use serde_json::Value;
use tauri::{AppHandle, State};

use crate::process::{
    engine_for, kill_shared, read_all, spawn_reader, strip_ansi, wait_for_exit, AppState,
};

/// Scans can take minutes on a full disk; the webview shows a cancellable
/// spinner and `analyze_cancel` kills the engine process.
#[tauri::command]
pub async fn analyze(
    app: AppHandle,
    state: State<'_, AppState>,
    path: Option<String>,
) -> Result<Value, String> {
    let engine = engine_for(&state, &app).await?;
    if let Some(previous) = state.analyze.lock().await.take() {
        kill_shared(&previous).await;
    }

    let mut command = engine.command();
    command.arg("analyze").arg("--json");
    if let Some(target) = path.as_deref().map(str::trim).filter(|target| !target.is_empty()) {
        command.arg(target);
    }

    let (shared, stdout, stderr) = spawn_reader(command).await?;
    *state.analyze.lock().await = Some(shared.clone());

    let (out, err) = tokio::join!(read_all(stdout), read_all(stderr));
    let code = wait_for_exit(&shared).await;
    {
        let mut guard = state.analyze.lock().await;
        if guard.as_ref().is_some_and(|current| Arc::ptr_eq(current, &shared)) {
            *guard = None;
        }
    }

    match code {
        Some(0) => serde_json::from_str(out.trim()).map_err(|error| {
            let detail = strip_ansi(&out);
            format!(
                "扫描输出不是有效 JSON（{error}）：{}",
                detail.trim().chars().take(280).collect::<String>()
            )
        }),
        Some(other) => {
            let detail = strip_ansi(&err);
            let detail = detail.trim();
            Err(if detail.is_empty() {
                format!("扫描以状态码 {other} 退出")
            } else {
                detail.to_string()
            })
        }
        None => Err("扫描已取消".to_string()),
    }
}

#[tauri::command]
pub async fn analyze_cancel(state: State<'_, AppState>) -> Result<(), String> {
    if let Some(shared) = state.analyze.lock().await.take() {
        kill_shared(&shared).await;
    }
    Ok(())
}
