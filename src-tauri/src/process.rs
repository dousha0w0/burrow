use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

use crate::engine::Engine;

/// A child process behind a shared slot, so `run_cancel` can reach the process
/// while the task that owns its pipes is still reading them.
pub type SharedChild = Arc<Mutex<Option<Child>>>;

#[derive(Default)]
pub struct AppState {
    pub engine: Mutex<Option<Engine>>,
    pub watch: Mutex<Option<SharedChild>>,
    pub analyze: Mutex<Option<SharedChild>>,
    pub runs: Mutex<HashMap<String, RunHandle>>,
}

pub struct RunHandle {
    pub child: SharedChild,
    pub cancelled: Arc<AtomicBool>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunLogEvent {
    pub run_id: String,
    pub stream: &'static str,
    pub line: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunExitEvent {
    pub run_id: String,
    pub code: Option<i32>,
    pub cancelled: bool,
}

/// Resolve (and memoise) the engine for the lifetime of the process.
pub async fn engine_for(state: &AppState, app: &tauri::AppHandle) -> Result<Engine, String> {
    let mut guard = state.engine.lock().await;
    if let Some(engine) = guard.as_ref() {
        return Ok(engine.clone());
    }
    let engine = Engine::resolve(app).await?;
    *guard = Some(engine.clone());
    Ok(engine)
}

/// Synchronous, best-effort termination used from the app exit handler: a
/// child `status --watch` would otherwise outlive the window and keep polling.
pub fn terminate_children(state: &AppState) {
    let signal = |pid: u32| {
        let _ = std::process::Command::new("/bin/kill")
            .args(["-TERM", &pid.to_string()])
            .status();
    };
    let collect = |shared: &SharedChild| {
        if let Ok(mut slot) = shared.try_lock() {
            if let Some(pid) = slot.as_mut().and_then(|child| child.id()) {
                signal(pid);
            }
        }
    };
    if let Ok(guard) = state.watch.try_lock() {
        if let Some(shared) = guard.as_ref() {
            collect(shared);
        }
    }
    if let Ok(guard) = state.analyze.try_lock() {
        if let Some(shared) = guard.as_ref() {
            collect(shared);
        }
    }
    if let Ok(guard) = state.runs.try_lock() {
        for handle in guard.values() {
            collect(&handle.child);
        }
    }
}

pub async fn kill_shared(shared: &SharedChild) {
    let pid = {
        let mut guard = shared.lock().await;
        guard.as_mut().and_then(|child| child.id())
    };
    if let Some(pid) = pid {
        // SIGTERM lets Mole restore the cursor, remove its temp dirs and close
        // the sudo keepalive; SIGKILL is only the give-up path below.
        let _ = std::process::Command::new("/bin/kill")
            .args(["-TERM", &pid.to_string()])
            .status();
        for _ in 0..12 {
            {
                let mut guard = shared.lock().await;
                match guard.as_mut() {
                    Some(child) => match child.try_wait() {
                        Ok(Some(_)) => return,
                        Ok(None) => {}
                        Err(_) => return,
                    },
                    None => return,
                }
            }
            tokio::time::sleep(Duration::from_millis(120)).await;
        }
    }
    let mut guard = shared.lock().await;
    if let Some(child) = guard.as_mut() {
        let _ = child.start_kill();
    }
}

/// Forward every line of a pipe to `emit`; returns when the pipe closes.
pub async fn pump_lines<F>(reader: impl tokio::io::AsyncRead + Unpin, mut emit: F)
where
    F: FnMut(String),
{
    let mut lines = BufReader::new(reader).lines();
    while let Ok(Some(line)) = lines.next_line().await {
        emit(line);
    }
}

/// Wait for the child to exit without holding the shared lock across awaits
/// that could block a cancel command.
pub async fn wait_for_exit(shared: &SharedChild) -> Option<i32> {
    loop {
        {
            let mut guard = shared.lock().await;
            match guard.as_mut() {
                Some(child) => match child.try_wait() {
                    Ok(Some(status)) => return status.code(),
                    Ok(None) => {}
                    Err(_) => return None,
                },
                None => return None,
            }
        }
        tokio::time::sleep(Duration::from_millis(120)).await;
    }
}

pub fn strip_ansi(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' {
            match chars.next() {
                Some('[') => {
                    for next in chars.by_ref() {
                        if ('@'..='~').contains(&next) {
                            break;
                        }
                    }
                }
                Some(']') => {
                    while let Some(next) = chars.next() {
                        if next == '\u{7}' {
                            break;
                        }
                        if next == '\u{1b}' && chars.peek() == Some(&'\\') {
                            chars.next();
                            break;
                        }
                    }
                }
                _ => {}
            }
            continue;
        }
        if ch != '\r' {
            out.push(ch);
        }
    }
    out
}

/// Run a command that prints one JSON document (status, analyze, history, apps).
pub async fn read_json_command(mut command: Command, timeout: Duration) -> Result<serde_json::Value, String> {
    command.stdout(Stdio::piped()).stderr(Stdio::piped()).stdin(Stdio::null());
    let child = command.spawn().map_err(|error| format!("无法启动引擎：{error}"))?;
    let output = tokio::time::timeout(timeout, child.wait_with_output())
        .await
        .map_err(|_| "引擎响应超时".to_string())?
        .map_err(|error| format!("读取引擎输出失败：{error}"))?;
    if !output.status.success() {
        let stderr = strip_ansi(&String::from_utf8_lossy(&output.stderr));
        let detail = stderr.trim();
        return Err(if detail.is_empty() {
            format!("引擎以状态码 {:?} 退出", output.status.code())
        } else {
            detail.to_string()
        });
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(stdout.trim()).map_err(|error| {
        let detail = strip_ansi(&stdout);
        format!(
            "引擎输出不是有效 JSON（{error}）：{}",
            detail.trim().chars().take(280).collect::<String>()
        )
    })
}

/// Spawn with piped output and return the child slot plus both pipes.
pub async fn spawn_reader(
    mut command: Command,
) -> Result<
    (
        SharedChild,
        impl tokio::io::AsyncRead + Unpin,
        impl tokio::io::AsyncRead + Unpin,
    ),
    String,
> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    let mut child = command.spawn().map_err(|error| format!("无法启动引擎：{error}"))?;
    let stdout = child.stdout.take().ok_or_else(|| "引擎没有输出管道".to_string())?;
    let stderr = child.stderr.take().ok_or_else(|| "引擎没有错误管道".to_string())?;
    Ok((Arc::new(Mutex::new(Some(child))), stdout, stderr))
}

pub async fn read_all(reader: impl tokio::io::AsyncRead + Unpin) -> String {
    let mut buf = Vec::new();
    let mut reader = reader;
    let _ = reader.read_to_end(&mut buf).await;
    String::from_utf8_lossy(&buf).to_string()
}

#[cfg(test)]
mod tests {
    use super::strip_ansi;

    #[test]
    fn strips_csi_colour_sequences() {
        assert_eq!(strip_ansi("\u{1b}[32m✓\u{1b}[0m cache"), "✓ cache");
        assert_eq!(strip_ansi("\u{1b}[1;38;5;208mPotential\u{1b}[m"), "Potential");
    }

    #[test]
    fn strips_osc_titles_and_carriage_returns() {
        assert_eq!(strip_ansi("\u{1b}]0;Mole\u{7}line\r"), "line");
    }

    #[test]
    fn keeps_plain_text_intact() {
        assert_eq!(strip_ansi("Tracked cleanup: 14.24GB | Items cleaned: 442"), "Tracked cleanup: 14.24GB | Items cleaned: 442");
    }
}
