use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use serde::Serialize;
use tauri::Manager;
use tokio::process::Command;

use crate::process::strip_ansi;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineInfo {
    pub root: String,
    pub entry: String,
    pub version: String,
    pub source: String,
    pub platform: String,
    pub arch: String,
}

#[derive(Clone, Debug)]
pub struct Engine {
    pub root: PathBuf,
    pub entry: PathBuf,
    pub source: &'static str,
    pub version: String,
}

impl Engine {
    pub fn command(&self) -> Command {
        let mut command = Command::new(&self.entry);
        if let Some(home) = std::env::var_os("HOME") {
            command.current_dir(home);
        }
        // Mole asks for admin rights on a TTY; the GUI runs user-level passes
        // non-interactively on purpose (the Clean view explains this).
        command.env("TERM", "dumb");
        command
    }

    pub fn info(&self) -> EngineInfo {
        EngineInfo {
            root: self.root.display().to_string(),
            entry: self.entry.display().to_string(),
            version: self.version.clone(),
            source: self.source.to_string(),
            platform: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
        }
    }

    /// Bundled engine first (reproducible, pinned at build time), then a
    /// Homebrew/script install the user already has.
    pub async fn resolve(app: &tauri::AppHandle) -> Result<Self, String> {
        let mut candidates: Vec<(PathBuf, &'static str)> = Vec::new();

        if cfg!(debug_assertions) {
            candidates.push((PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("engine"), "bundled"));
        }
        if let Ok(resource) = app.path().resource_dir() {
            candidates.push((resource.join("engine"), "bundled"));
        }
        for prefix in ["/opt/homebrew/bin", "/usr/local/bin"] {
            let dir = PathBuf::from(prefix);
            if dir.join("mo").is_file() {
                candidates.push((dir, "system"));
            }
        }
        if let Some(path) = std::env::var_os("PATH") {
            for dir in std::env::split_paths(&path) {
                if dir.join("mo").is_file() {
                    candidates.push((dir, "system"));
                    break;
                }
            }
        }

        for (root, source) in candidates {
            if let Some(entry) = engine_entry(&root) {
                let version = read_version(&entry).await;
                return Ok(Engine {
                    root,
                    entry,
                    source,
                    version,
                });
            }
        }
        Err("未找到 Mole 引擎：重装 Burrow 可恢复内置引擎，或安装 Mole（brew install mole）".to_string())
    }
}

fn engine_entry(root: &Path) -> Option<PathBuf> {
    let entry = root.join("mo");
    if entry.is_file() {
        return Some(entry);
    }
    let fallback = root.join("mole");
    fallback.is_file().then_some(fallback)
}

async fn read_version(entry: &Path) -> String {
    let mut command = Command::new(entry);
    command
        .arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    let collected = match tokio::time::timeout(Duration::from_secs(20), command.output()).await {
        Ok(Ok(output)) => output,
        _ => return "unknown".to_string(),
    };
    let text = strip_ansi(&String::from_utf8_lossy(&collected.stdout));
    for line in text.lines() {
        if let Some(rest) = line.trim().strip_prefix("Mole version ") {
            return rest.trim().to_string();
        }
    }
    "unknown".to_string()
}
