//! Environment diagnostics: is the bundled engine intact, is this build
//! installed properly, what can the app actually read, and are we behind
//! upstream? Everything here is read-only.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, State};
use tokio::process::Command;

use crate::process::{engine_for, AppState};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Check {
    pub id: String,
    pub ok: bool,
    pub detail: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallReport {
    pub app_path: String,
    pub in_applications: bool,
    pub quarantined: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineReport {
    pub ok: bool,
    pub source: String,
    pub version: String,
    pub root: String,
    pub entry: String,
    pub checks: Vec<Check>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionProbe {
    pub path: String,
    pub readable: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionReport {
    pub full_disk_access: bool,
    pub probes: Vec<PermissionProbe>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentReport {
    pub install: InstallReport,
    pub engine: EngineReport,
    pub permissions: PermissionReport,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseStatus {
    pub current: String,
    pub latest: Option<String>,
    pub update_available: bool,
    pub url: Option<String>,
    pub error: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReport {
    pub engine: ReleaseStatus,
    pub app: ReleaseStatus,
    pub checked_at: u64,
}

const MOLE_REPO: &str = "tw93/Mole";
const BURROW_REPO: &str = "dousha0w0/burrow";
const VERSION_CHECK_TIMEOUT: Duration = Duration::from_secs(20);

fn check(id: &str, ok: bool, detail: impl Into<Option<String>>) -> Check {
    Check {
        id: id.to_string(),
        ok,
        detail: detail.into(),
    }
}

fn bundle_root(exe: &Path) -> Option<PathBuf> {
    exe.ancestors()
        .find(|path| path.extension().is_some_and(|ext| ext == "app"))
        .map(Path::to_path_buf)
}

fn quarantined(app: &Path) -> bool {
    std::process::Command::new("/usr/bin/xattr")
        .args(["-p", "com.apple.quarantine"])
        .arg(app)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn probe(path: PathBuf) -> PermissionProbe {
    let readable = if path.is_dir() {
        std::fs::read_dir(&path).is_ok()
    } else {
        std::fs::File::open(&path).is_ok()
    };
    PermissionProbe {
        path: path.display().to_string(),
        readable,
    }
}

async fn runs(entry: &Path) -> bool {
    let mut command = Command::new(entry);
    command
        .arg("--help")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    match tokio::time::timeout(VERSION_CHECK_TIMEOUT, command.status()).await {
        Ok(Ok(status)) => status.success(),
        _ => false,
    }
}

/// Install shape, engine integrity and TCC reachability in one round-trip.
#[tauri::command]
pub async fn environment_report(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<EnvironmentReport, String> {
    let exe = std::env::current_exe().map_err(|error| format!("无法定位应用路径：{error}"))?;
    let bundle = bundle_root(&exe).unwrap_or_else(|| exe.clone());
    let in_applications = bundle.starts_with("/Applications");
    let install = InstallReport {
        app_path: bundle.display().to_string(),
        in_applications,
        quarantined: quarantined(&bundle),
    };

    let engine = engine_for(&state, &app).await?;
    let canonical = std::fs::canonicalize(&engine.entry).unwrap_or_else(|_| engine.entry.clone());
    let entry_dir = canonical.parent().map(Path::to_path_buf).unwrap_or_default();
    let bin_dir = if entry_dir.join("bin").join("status-go").is_file() {
        entry_dir.join("bin")
    } else {
        entry_dir.clone()
    };
    let status_ok = bin_dir.join("status-go").is_file();
    let analyze_ok = bin_dir.join("analyze-go").is_file();
    let lib_ok = entry_dir.join("lib/core/common.sh").is_file()
        || entry_dir
            .parent()
            .is_some_and(|parent| parent.join("lib/core/common.sh").is_file());
    let runner_ok = runs(&engine.entry).await;
    let version_ok = engine.version != "unknown";

    let checks = vec![
        check("entry", engine.entry.is_file(), Some(engine.entry.display().to_string())),
        check("library", lib_ok, Some(entry_dir.join("lib").display().to_string())),
        check(
            "binaries",
            status_ok && analyze_ok,
            Some(bin_dir.display().to_string()),
        ),
        check("version", version_ok, Some(engine.version.clone())),
        check("runner", runner_ok, None),
    ];
    let engine_report = EngineReport {
        ok: checks.iter().all(|item| item.ok),
        source: engine.source.to_string(),
        version: engine.version.clone(),
        root: engine.root.display().to_string(),
        entry: engine.entry.display().to_string(),
        checks,
    };

    let home = std::env::var_os("HOME").map(PathBuf::from).unwrap_or_default();
    let probes = vec![
        probe(home.join("Library/Application Support/com.apple.TCC/TCC.db")),
        probe(PathBuf::from("/Library/Application Support/com.apple.TCC/TCC.db")),
        probe(home.join("Library/Mail")),
        probe(home.join("Library/Safari")),
    ];
    // TCC.db and Mail are both protected without Full Disk Access; Safari's
    // directory varies more between macOS releases, so it stays informational.
    let full_disk_access = probes.iter().take(3).any(|item| item.readable);
    let permissions = PermissionReport {
        full_disk_access,
        probes,
    };

    Ok(EnvironmentReport {
        install,
        engine: engine_report,
        permissions,
    })
}

fn normalize_tag(tag: &str) -> String {
    tag.trim().trim_start_matches(['v', 'V']).to_string()
}

fn version_key(version: &str) -> Option<Vec<u64>> {
    let core = version.split(['-', '+']).next().unwrap_or(version);
    let mut parts = Vec::new();
    for segment in core.split('.') {
        let digits: String = segment.chars().take_while(char::is_ascii_digit).collect();
        if digits.is_empty() {
            return None;
        }
        parts.push(digits.parse().ok()?);
    }
    (!parts.is_empty()).then_some(parts)
}

fn is_newer(latest: &str, current: &str) -> bool {
    match (version_key(latest), version_key(current)) {
        (Some(left), Some(right)) => left > right,
        _ => false,
    }
}

fn parse_release(body: &str) -> Result<(String, String), String> {
    let value: serde_json::Value =
        serde_json::from_str(body).map_err(|error| format!("版本信息不是有效 JSON：{error}"))?;
    let tag = value
        .get("tag_name")
        .and_then(|tag| tag.as_str())
        .ok_or_else(|| "版本信息缺少 tag_name".to_string())?;
    let url = value
        .get("html_url")
        .and_then(|url| url.as_str())
        .unwrap_or_default();
    Ok((normalize_tag(tag), url.to_string()))
}

async fn curl(args: &[&str]) -> Result<String, String> {
    let mut command = Command::new("/usr/bin/curl");
    command
        .args(args)
        .stdin(Stdio::null())
        .kill_on_drop(true);
    let output = tokio::time::timeout(Duration::from_secs(15), command.output())
        .await
        .map_err(|_| "检查更新超时".to_string())?
        .map_err(|error| format!("无法运行 curl：{error}"))?;
    if !output.status.success() {
        return Err("网络不可用或 GitHub 拒绝请求（可能触发了限流）".to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn tag_from_url(url: &str) -> Option<String> {
    url.rsplit_once("/tag/")
        .map(|(_, tag)| normalize_tag(tag))
        .filter(|tag| !tag.is_empty() && !tag.contains('/'))
}

/// The web redirect is not rate-limited like the REST API, so try it first and
/// keep the API as a second chance.
async fn latest_release(repo: &str) -> Result<(String, String), String> {
    let page = format!("https://github.com/{repo}/releases/latest");
    let effective = curl(&[
        "-fsSL",
        "-o",
        "/dev/null",
        "-w",
        "%{url_effective}",
        "--max-time",
        "10",
        "-A",
        "burrow-update-check",
        &page,
    ])
    .await;
    if let Ok(url) = &effective {
        if let Some(tag) = tag_from_url(url) {
            return Ok((tag, url.clone()));
        }
    }
    let api = format!("https://api.github.com/repos/{repo}/releases/latest");
    let body = curl(&[
        "-fsSL",
        "--max-time",
        "10",
        "-H",
        "Accept: application/vnd.github+json",
        "-A",
        "burrow-update-check",
        &api,
    ])
    .await?;
    parse_release(&body)
}

fn status(current: &str, latest: Result<(String, String), String>) -> ReleaseStatus {
    match latest {
        Ok((tag, url)) => ReleaseStatus {
            current: current.to_string(),
            latest: Some(tag.clone()),
            update_available: is_newer(&tag, current),
            url: (!url.is_empty()).then_some(url),
            error: None,
        },
        Err(error) => ReleaseStatus {
            current: current.to_string(),
            latest: None,
            update_available: false,
            url: None,
            error: Some(error),
        },
    }
}

#[tauri::command]
pub async fn check_updates(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<UpdateReport, String> {
    let engine_version = engine_for(&state, &app)
        .await
        .map(|engine| engine.version)
        .unwrap_or_else(|_| "unknown".to_string());
    let (mole, burrow) = tokio::join!(latest_release(MOLE_REPO), latest_release(BURROW_REPO));
    let checked_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    Ok(UpdateReport {
        engine: status(&engine_version, mole),
        app: status(env!("CARGO_PKG_VERSION"), burrow),
        checked_at,
    })
}

#[cfg(test)]
mod tests {
    use super::{is_newer, normalize_tag, parse_release, tag_from_url, version_key};

    #[test]
    fn normalises_release_tags() {
        assert_eq!(normalize_tag("V1.64.0"), "1.64.0");
        assert_eq!(normalize_tag("v0.1.1"), "0.1.1");
    }

    #[test]
    fn compares_numeric_versions() {
        assert!(is_newer("1.65.0", "1.64.0"));
        assert!(!is_newer("1.9.0", "1.10.0"));
        assert!(is_newer("1.10.0", "1.9.0"));
        assert!(!is_newer("1.64.0", "1.64.0"));
        assert!(!is_newer("nightly", "1.64.0"));
        assert_eq!(version_key("1.64.0-beta.1"), Some(vec![1, 64, 0]));
    }

    #[test]
    fn reads_tags_from_release_urls() {
        assert_eq!(
            tag_from_url("https://github.com/tw93/Mole/releases/tag/V1.64.0"),
            Some("1.64.0".to_string())
        );
        assert_eq!(tag_from_url("https://github.com/tw93/Mole/releases"), None);
    }

    #[test]
    fn parses_github_release_payloads() {
        let body = r#"{"tag_name":"V1.64.0","html_url":"https://github.com/tw93/Mole/releases/tag/V1.64.0"}"#;
        assert_eq!(
            parse_release(body).unwrap(),
            ("1.64.0".to_string(), "https://github.com/tw93/Mole/releases/tag/V1.64.0".to_string())
        );
        assert!(parse_release("{}").is_err());
    }
}
