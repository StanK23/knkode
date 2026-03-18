use crate::pty::PtyManager;
use serde::Serialize;
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Emitter;

const POLL_INTERVAL: Duration = Duration::from_secs(3);
const PR_REFRESH_INTERVAL: Duration = Duration::from_secs(60);
const TOOL_RETRY_INTERVAL: Duration = Duration::from_secs(300);
const MAX_PR_TITLE_LEN: usize = 256;

/// Extra PATH directories for subprocess calls. Tauri launched from Dock/Spotlight
/// inherits a minimal PATH — Homebrew/Linuxbrew tools are invisible without this.
const EXTRA_PATH_DIRS: &[&str] = &[
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/home/linuxbrew/.linuxbrew/bin",
];

#[derive(Clone, Serialize)]
pub struct PrInfo {
    pub number: u32,
    pub url: String,
    pub title: String,
}

struct PaneState {
    cwd: String,
    branch: Option<String>,
    pr: Option<PrInfo>,
    pr_last_checked: Instant,
}

/// Per-pane CWD, git branch, and PR status tracker.
/// Polls every 3 seconds using OS-level CWD detection + git/gh CLI.
pub struct CwdTracker {
    panes: Arc<Mutex<HashMap<String, PaneState>>>,
    running: Arc<AtomicBool>,
}

impl CwdTracker {
    pub fn new() -> Self {
        Self {
            panes: Arc::new(Mutex::new(HashMap::new())),
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn track_pane(&self, pane_id: String, initial_cwd: String) {
        if let Ok(mut panes) = self.panes.lock() {
            panes.insert(
                pane_id,
                PaneState {
                    cwd: initial_cwd,
                    branch: None,
                    pr: None,
                    pr_last_checked: Instant::now() - PR_REFRESH_INTERVAL,
                },
            );
        }
    }

    pub fn untrack_pane(&self, pane_id: &str) {
        if let Ok(mut panes) = self.panes.lock() {
            panes.remove(pane_id);
        }
    }

    /// Start the background polling thread. No-op if already running.
    pub fn start(&self, app: tauri::AppHandle, pty_manager: Arc<PtyManager>) {
        if self.running.swap(true, Ordering::SeqCst) {
            return;
        }

        let panes = Arc::clone(&self.panes);
        let running = Arc::clone(&self.running);

        std::thread::Builder::new()
            .name("cwd-tracker".into())
            .spawn(move || {
                let augmented_path = build_augmented_path();
                let mut git_missing_since: Option<Instant> = None;
                let mut gh_missing_since: Option<Instant> = None;
                let mut gh_logged_errors: HashSet<String> = HashSet::new();

                while running.load(Ordering::SeqCst) {
                    let pane_ids: Vec<String> = {
                        match panes.lock() {
                            Ok(p) => p.keys().cloned().collect(),
                            Err(_) => break,
                        }
                    };

                    for pane_id in pane_ids {
                        if !running.load(Ordering::SeqCst) {
                            break;
                        }

                        let current_cwd = pty_manager.get_cwd(&pane_id);
                        let (last_cwd, last_branch) = {
                            match panes.lock() {
                                Ok(p) => match p.get(&pane_id) {
                                    Some(state) => {
                                        (state.cwd.clone(), state.branch.clone())
                                    }
                                    None => continue,
                                },
                                Err(_) => break,
                            }
                        };

                        // CWD change detection
                        let cwd = if let Some(ref detected) = current_cwd {
                            if *detected != last_cwd {
                                if let Ok(mut p) = panes.lock() {
                                    if let Some(state) = p.get_mut(&pane_id) {
                                        state.cwd = detected.clone();
                                    }
                                }
                                let _ = app.emit(
                                    "pty:cwd-changed",
                                    json!({ "paneId": &pane_id, "cwd": detected }),
                                );
                            }
                            detected.clone()
                        } else {
                            last_cwd.clone()
                        };

                        // Git branch detection
                        if should_retry_tool(&mut git_missing_since) {
                            match get_git_branch(&cwd, &augmented_path) {
                                ToolResult::Ok(current_branch) => {
                                    git_missing_since = None;
                                    let branch_changed = current_branch != last_branch;
                                    if branch_changed {
                                        if let Ok(mut p) = panes.lock() {
                                            if let Some(state) = p.get_mut(&pane_id) {
                                                state.branch = current_branch.clone();
                                            }
                                        }
                                        let _ = app.emit(
                                            "pty:branch-changed",
                                            json!({ "paneId": &pane_id, "branch": current_branch }),
                                        );
                                    }

                                    // PR detection
                                    let should_check_pr = branch_changed
                                        || panes
                                            .lock()
                                            .ok()
                                            .and_then(|p| {
                                                p.get(&pane_id).map(|s| {
                                                    s.pr_last_checked.elapsed() >= PR_REFRESH_INTERVAL
                                                })
                                            })
                                            .unwrap_or(false);

                                    if branch_changed {
                                        // Clear stale PR from previous branch immediately
                                        let had_pr = panes
                                            .lock()
                                            .ok()
                                            .and_then(|mut p| {
                                                p.get_mut(&pane_id).map(|s| {
                                                    let had = s.pr.is_some();
                                                    s.pr = None;
                                                    had
                                                })
                                            })
                                            .unwrap_or(false);
                                        if had_pr {
                                            let _ = app.emit(
                                                "pty:pr-changed",
                                                json!({ "paneId": &pane_id, "pr": null }),
                                            );
                                        }
                                    }

                                    if current_branch.is_some()
                                        && should_check_pr
                                        && should_retry_tool(&mut gh_missing_since)
                                    {
                                        if let Ok(mut p) = panes.lock() {
                                            if let Some(state) = p.get_mut(&pane_id) {
                                                state.pr_last_checked = Instant::now();
                                            }
                                        }

                                        match get_pr_status(
                                            &cwd,
                                            &augmented_path,
                                            &mut gh_logged_errors,
                                        ) {
                                            ToolResult::Ok(pr) => {
                                                gh_missing_since = None;
                                                let current_num =
                                                    pr.as_ref().map(|p| p.number);
                                                let last_num = panes
                                                    .lock()
                                                    .ok()
                                                    .and_then(|p| {
                                                        p.get(&pane_id)
                                                            .and_then(|s| {
                                                                s.pr.as_ref().map(|p| p.number)
                                                            })
                                                    });
                                                if current_num != last_num {
                                                    let _ = app.emit(
                                                        "pty:pr-changed",
                                                        json!({ "paneId": &pane_id, "pr": pr }),
                                                    );
                                                    if let Ok(mut p) = panes.lock() {
                                                        if let Some(state) =
                                                            p.get_mut(&pane_id)
                                                        {
                                                            state.pr = pr;
                                                        }
                                                    }
                                                }
                                            }
                                            ToolResult::ToolMissing => {
                                                if gh_missing_since.is_none() {
                                                    gh_missing_since = Some(Instant::now());
                                                    eprintln!("[tracker] gh CLI not found — PR detection disabled (will retry)");
                                                }
                                            }
                                            ToolResult::Err => {}
                                        }
                                    } else if current_branch.is_none() {
                                        // No branch = no PR
                                        let had_pr = panes
                                            .lock()
                                            .ok()
                                            .and_then(|mut p| {
                                                p.get_mut(&pane_id).map(|s| {
                                                    let had = s.pr.is_some();
                                                    s.pr = None;
                                                    had
                                                })
                                            })
                                            .unwrap_or(false);
                                        if had_pr {
                                            let _ = app.emit(
                                                "pty:pr-changed",
                                                json!({ "paneId": &pane_id, "pr": null }),
                                            );
                                        }
                                    }
                                }
                                ToolResult::ToolMissing => {
                                    if git_missing_since.is_none() {
                                        git_missing_since = Some(Instant::now());
                                        eprintln!("[tracker] git not found — branch detection disabled (will retry)");
                                    }
                                }
                                ToolResult::Err => {}
                            }
                        }
                    }

                    std::thread::sleep(POLL_INTERVAL);
                }
            })
            .expect("Failed to spawn cwd-tracker thread");
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        if let Ok(mut panes) = self.panes.lock() {
            panes.clear();
        }
    }
}

enum ToolResult<T> {
    Ok(T),
    ToolMissing,
    Err,
}

/// Check if a tool should be retried. Returns true if the tool is available
/// or if enough time has passed since it was last found missing.
fn should_retry_tool(missing_since: &mut Option<Instant>) -> bool {
    match missing_since {
        None => true,
        Some(since) => {
            if since.elapsed() >= TOOL_RETRY_INTERVAL {
                *missing_since = None;
                eprintln!("[tracker] Retrying CLI detection…");
                true
            } else {
                false
            }
        }
    }
}

fn get_git_branch(cwd: &str, augmented_path: &str) -> ToolResult<Option<String>> {
    let result = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(cwd)
        .env("PATH", augmented_path)
        .output();

    match result {
        Ok(output) => {
            if output.status.success() {
                let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
                ToolResult::Ok(if branch.is_empty() {
                    None
                } else {
                    Some(branch)
                })
            } else {
                // Exit code != 0 — not a git repo or other error
                ToolResult::Ok(None)
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => ToolResult::ToolMissing,
        Err(_) => ToolResult::Err,
    }
}

fn get_pr_status(
    cwd: &str,
    augmented_path: &str,
    logged_errors: &mut HashSet<String>,
) -> ToolResult<Option<PrInfo>> {
    let result = Command::new("gh")
        .args(["pr", "view", "--json", "number,url,title,state"])
        .current_dir(cwd)
        .env("PATH", augmented_path)
        .output();

    match result {
        Ok(output) => {
            if output.status.success() {
                match serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                    Ok(data) => {
                        let number = data.get("number").and_then(|v| v.as_u64());
                        let url = data.get("url").and_then(|v| v.as_str());
                        let title = data.get("title").and_then(|v| v.as_str());
                        let state = data.get("state").and_then(|v| v.as_str());

                        if let (Some(number), Some(url), Some(title), Some("OPEN")) =
                            (number, url, title, state)
                        {
                            // Validate URL protocol
                            if !url.starts_with("https://") && !url.starts_with("http://") {
                                eprintln!(
                                    "[tracker] gh pr URL has unexpected protocol: {}",
                                    &url[..url.find(':').unwrap_or(10).min(20)]
                                );
                                return ToolResult::Ok(None);
                            }
                            let title = if title.len() > MAX_PR_TITLE_LEN {
                                format!("{}...", &title[..MAX_PR_TITLE_LEN - 3])
                            } else {
                                title.to_string()
                            };
                            ToolResult::Ok(Some(PrInfo {
                                number: number as u32,
                                url: url.to_string(),
                                title,
                            }))
                        } else {
                            ToolResult::Ok(None)
                        }
                    }
                    Err(e) => {
                        eprintln!(
                            "[tracker] Failed to parse gh pr output: {}",
                            &String::from_utf8_lossy(&output.stdout)
                                [..200.min(output.stdout.len())]
                        );
                        eprintln!("[tracker] Parse error: {e}");
                        ToolResult::Err
                    }
                }
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                if !stderr.is_empty()
                    && !stderr.contains("no pull requests found")
                    && logged_errors.insert(stderr.clone())
                {
                    eprintln!(
                        "[tracker] gh pr view failed: {}",
                        &stderr[..200.min(stderr.len())]
                    );
                }
                ToolResult::Ok(None)
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => ToolResult::ToolMissing,
        Err(_) => ToolResult::Err,
    }
}

/// Build an augmented PATH with extra directories for Homebrew/Linuxbrew.
/// Cached for the lifetime of the polling thread.
fn build_augmented_path() -> String {
    let current = std::env::var("PATH").unwrap_or_default();
    let segments: HashSet<&str> = current.split(':').collect();
    let missing: Vec<&&str> = EXTRA_PATH_DIRS
        .iter()
        .filter(|d| !segments.contains(**d))
        .collect();
    if missing.is_empty() {
        current
    } else {
        format!(
            "{}:{}",
            current,
            missing.iter().map(|d| **d).collect::<Vec<&str>>().join(":")
        )
    }
}
