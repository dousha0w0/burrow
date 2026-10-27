use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, State, WebviewWindow};

use crate::process::{engine_for, AppState};

fn quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

#[tauri::command]
pub fn reveal_path(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("无法在 Finder 中显示：{error}"))
}

#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("只允许打开 http(s) 链接".to_string());
    }
    std::process::Command::new("open")
        .arg(&url)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("无法打开链接：{error}"))
}

/// Hand an interactive Mole flow to Terminal. The GUI never pipes a password
/// or fabricates confirmations; Mole keeps its own TTY prompts there.
#[tauri::command]
pub async fn terminal_run(
    app: AppHandle,
    state: State<'_, AppState>,
    kind: String,
    target: Option<String>,
) -> Result<(), String> {
    let engine = engine_for(&state, &app).await?;
    let entry = quote(&engine.entry.display().to_string());

    let mut script = String::from("#!/bin/bash\nclear\n");
    match kind.as_str() {
        "clean" => script.push_str(&format!("{entry} clean\n")),
        "purge" => script.push_str(&format!("{entry} purge\n")),
        "update" => script.push_str(&format!("{entry} update\n")),
        "optimize" => script.push_str(&format!("{entry} optimize\n")),
        "uninstall" => {
            let name = target.ok_or_else(|| "缺少应用名".to_string())?;
            script.push_str(&format!("{entry} uninstall {}\n", quote(&name)));
        }
        other => return Err(format!("不支持的操作：{other}")),
    }
    script.push_str("\nprintf '\\n完成，按任意键关闭窗口…'\nread -n 1 -s -r\n");

    let path = std::env::temp_dir().join(format!("burrow-{kind}.command"));
    std::fs::write(&path, script).map_err(|error| format!("无法写入终端脚本：{error}"))?;
    let permissions = std::fs::Permissions::from_mode(0o700);
    std::fs::set_permissions(&path, permissions).map_err(|error| format!("无法设置脚本权限：{error}"))?;

    std::process::Command::new("open")
        .arg("-a")
        .arg("Terminal")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("无法打开终端：{error}"))
}

/// Deep-link to the Full Disk Access pane; the scheme differs before Sonoma.
#[tauri::command]
pub fn open_privacy_settings() -> Result<(), String> {
    let panes = [
        "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AllFiles",
        "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
    ];
    for pane in panes {
        let ok = std::process::Command::new("open")
            .arg(pane)
            .status()
            .map(|status| status.success())
            .unwrap_or(false);
        if ok {
            return Ok(());
        }
    }
    Err("无法打开系统设置的隐私页面".to_string())
}

#[tauri::command]
pub fn log_message(level: String, message: String) -> Result<(), String> {
    let home = std::env::var_os("HOME").ok_or_else(|| "HOME 未设置".to_string())?;
    let dir = PathBuf::from(home).join("Library/Logs/Burrow");
    std::fs::create_dir_all(&dir).map_err(|error| format!("无法创建日志目录：{error}"))?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    let line = format!("{stamp} [{level}] {message}\n");
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(dir.join("burrow.log"))
        .map_err(|error| format!("无法写入日志：{error}"))?;
    use std::io::Write;
    file.write_all(line.as_bytes())
        .map_err(|error| format!("无法写入日志：{error}"))
}

/// The window starts hidden so the first thing the user sees is a painted UI.
#[tauri::command]
pub fn ui_ready(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}
