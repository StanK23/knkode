use crate::config::ConfigStore;
use crate::pty::PtyManager;
use crate::session_scanner;
use crate::terminal::{AnsiThemeColors, GridSnapshot, SelectionRange, TerminalState};
use crate::tracker::CwdTracker;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashSet;
use std::env;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::State;

const MIN_SCROLLBACK: usize = 500;
const MAX_SCROLLBACK: usize = 50_000;

#[derive(Serialize)]
pub struct ShellOption {
    value: String,
    label: String,
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    let path = crate::config::home_dir()?;
    path.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Home directory path contains invalid UTF-8".to_string())
}

fn validate_absolute_path(value: &str, field_name: &str, require_dir: bool) -> Result<(), String> {
    if value.contains('\0') {
        return Err(format!("{field_name} must not contain null bytes"));
    }
    let path = std::path::Path::new(value);
    if !path.is_absolute() {
        return Err(format!("{field_name} must be an absolute path"));
    }
    if require_dir && !path.is_dir() {
        return Err(format!(
            "{field_name} does not exist or is not a directory: {value}"
        ));
    }
    Ok(())
}

fn find_in_path(executable: &str) -> Option<PathBuf> {
    let candidate = Path::new(executable);
    if candidate.is_absolute() && candidate.is_file() {
        return Some(candidate.to_path_buf());
    }

    let path_var = env::var_os("PATH")?;
    env::split_paths(&path_var)
        .map(|dir| dir.join(executable))
        .find(|path| path.is_file())
}

#[cfg(target_os = "windows")]
fn system_root_join(parts: &[&str]) -> Option<PathBuf> {
    let root = env::var_os("SystemRoot")?;
    let mut path = PathBuf::from(root);
    for part in parts {
        path.push(part);
    }
    Some(path)
}

#[cfg(target_os = "windows")]
fn join_from_env(env_name: &str, parts: &[&str]) -> Option<PathBuf> {
    let root = env::var_os(env_name)?;
    let mut path = PathBuf::from(root);
    for part in parts {
        path.push(part);
    }
    Some(path)
}

#[tauri::command]
pub fn get_available_shells() -> Vec<ShellOption> {
    // Only surface shells that are both installed and known-good with the
    // current PTY launch model. Anything more exotic should stay reachable
    // through the UI's `Custom…` path until we explicitly validate it.
    #[cfg(target_os = "windows")]
    let candidates: [(&str, &[&str]); 3] = [
        (
            "PowerShell",
            &["powershell.exe", "WindowsPowerShell\\v1.0\\powershell.exe"],
        ),
        ("PowerShell 7", &["pwsh.exe", "PowerShell\\7\\pwsh.exe"]),
        ("Command Prompt", &["cmd.exe", "System32\\cmd.exe"]),
    ];

    #[cfg(not(target_os = "windows"))]
    let candidates: [(&str, &[&str]); 3] = [
        ("Zsh", &["/bin/zsh", "/usr/bin/zsh"]),
        ("Bash", &["/bin/bash", "/usr/bin/bash"]),
        (
            "Fish",
            &[
                "/opt/homebrew/bin/fish",
                "/usr/local/bin/fish",
                "/usr/bin/fish",
            ],
        ),
    ];

    let mut seen = HashSet::new();
    let mut options = Vec::new();

    for (label, paths) in candidates {
        let resolved = paths.iter().find_map(|candidate| {
            #[cfg(target_os = "windows")]
            {
                find_in_path(candidate).or_else(|| {
                    if candidate.contains('\\') {
                        let parts: Vec<&str> = candidate.split('\\').collect();
                        system_root_join(&parts)
                            .filter(|path| path.is_file())
                            .or_else(|| {
                                join_from_env("ProgramW6432", &parts).filter(|path| path.is_file())
                            })
                            .or_else(|| {
                                join_from_env("ProgramFiles", &parts).filter(|path| path.is_file())
                            })
                    } else {
                        None
                    }
                })
            }

            #[cfg(not(target_os = "windows"))]
            {
                find_in_path(candidate)
            }
        });

        if let Some(path) = resolved {
            let value = path.to_string_lossy().to_string();
            if seen.insert(value.clone()) {
                options.push(ShellOption {
                    value,
                    label: label.to_string(),
                });
            }
        }
    }

    options
}

// --- Config commands ---

#[tauri::command]
pub fn get_workspaces(config: State<'_, ConfigStore>) -> Result<Vec<Value>, String> {
    config.get_workspaces()
}

#[tauri::command]
pub fn save_workspace(workspace: Value, config: State<'_, ConfigStore>) -> Result<(), String> {
    config.save_workspace(workspace)
}

#[tauri::command]
pub fn delete_workspace(id: String, config: State<'_, ConfigStore>) -> Result<(), String> {
    config.delete_workspace(&id)
}

#[tauri::command]
pub fn get_app_state(config: State<'_, ConfigStore>) -> Result<Value, String> {
    config.get_app_state()
}

#[tauri::command]
pub fn save_app_state(state: Value, config: State<'_, ConfigStore>) -> Result<(), String> {
    config.save_app_state(state)
}

#[tauri::command]
pub fn get_snippets(config: State<'_, ConfigStore>) -> Result<Vec<Value>, String> {
    config.get_snippets()
}

#[tauri::command]
pub fn save_snippets(snippets: Vec<Value>, config: State<'_, ConfigStore>) -> Result<(), String> {
    config.save_snippets(snippets)
}

// --- PTY commands ---

#[tauri::command]
pub fn create_pty(
    id: String,
    cwd: String,
    shell: Option<String>,
    startup_command: Option<String>,
    scrollback: usize,
    pty_mgr: State<'_, Arc<PtyManager>>,
    tracker: State<'_, CwdTracker>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    validate_absolute_path(&cwd, "cwd", true)?;
    if let Some(ref shell) = shell {
        if shell.contains('\0') {
            return Err("shell must not contain null bytes".to_string());
        }
    }
    if let Some(ref cmd) = startup_command {
        if cmd.contains('\0') {
            return Err("startup_command must not contain null bytes".to_string());
        }
    }
    if !(MIN_SCROLLBACK..=MAX_SCROLLBACK).contains(&scrollback) {
        return Err(format!(
            "scrollback must be between {MIN_SCROLLBACK} and {MAX_SCROLLBACK}"
        ));
    }
    pty_mgr.create(
        id.clone(),
        cwd.clone(),
        shell,
        startup_command,
        scrollback,
        app,
    )?;
    tracker.track_pane(id, cwd);
    Ok(())
}

#[tauri::command]
pub fn write_pty(
    id: String,
    data: String,
    pty_mgr: State<'_, Arc<PtyManager>>,
    tracker: State<'_, CwdTracker>,
) -> Result<(), String> {
    if !data.is_empty() {
        tracker.mark_user_input(&id);
    }
    pty_mgr.write(&id, &data)
}

#[tauri::command]
pub fn resize_pty(
    id: String,
    cols: u16,
    rows: u16,
    pixel_width: Option<u16>,
    pixel_height: Option<u16>,
    scroll_offset: Option<usize>,
    pty_mgr: State<'_, Arc<PtyManager>>,
    terminal_state: State<'_, Arc<TerminalState>>,
) -> Result<GridSnapshot, String> {
    if cols == 0 || rows == 0 {
        return Err("cols and rows must be at least 1".to_string());
    }
    if cols > 500 || rows > 500 {
        return Err(format!(
            "cols ({cols}) and rows ({rows}) must not exceed 500"
        ));
    }
    // Cap pixel dimensions to a reasonable maximum; 0 = unknown/unset
    let pw = pixel_width.unwrap_or(0).min(16384);
    let ph = pixel_height.unwrap_or(0).min(16384);
    pty_mgr.resize(&id, cols, rows, pw, ph)?;
    terminal_state
        .snapshot_at_offset(&id, scroll_offset.unwrap_or(0))
        .ok_or_else(|| format!("Terminal session not found: {id}"))
}

/// Register a pane for git branch/PR tracking without spawning a PTY.
/// Used for panes whose workspace hasn't been visited yet — the CwdTracker
/// will poll their CWD for branch info so the sidebar shows git status.
#[tauri::command]
pub fn track_pane_git(
    id: String,
    cwd: String,
    tracker: State<'_, CwdTracker>,
) -> Result<(), String> {
    validate_absolute_path(&cwd, "cwd", true)?;
    tracker.track_pane(id, cwd);
    Ok(())
}

#[tauri::command]
pub fn kill_pty(
    id: String,
    pty_mgr: State<'_, Arc<PtyManager>>,
    tracker: State<'_, CwdTracker>,
) -> Result<(), String> {
    tracker.untrack_pane(&id);
    pty_mgr.kill(&id)
}

// --- Terminal scroll ---

#[tauri::command]
pub fn scroll_terminal(
    id: String,
    offset: usize,
    terminal_state: State<'_, Arc<TerminalState>>,
) -> Result<GridSnapshot, String> {
    terminal_state
        .snapshot_at_offset(&id, offset)
        .ok_or_else(|| format!("Terminal session not found: {id}"))
}

// --- Terminal colors ---

#[tauri::command]
pub fn set_terminal_colors(
    id: String,
    ansi_colors: AnsiThemeColors,
    foreground: String,
    background: String,
    terminal_state: State<'_, Arc<TerminalState>>,
) -> Result<(), String> {
    terminal_state.set_colors(&id, &ansi_colors, &foreground, &background)
}

// --- Terminal selection ---

#[tauri::command]
pub fn get_selection_text(
    id: String,
    range: SelectionRange,
    terminal_state: State<'_, Arc<TerminalState>>,
) -> Result<String, String> {
    terminal_state.extract_text(&id, &range)
}

// --- Session history ---

#[tauri::command]
pub fn list_agent_sessions(
    project_cwd: String,
) -> Result<Vec<session_scanner::AgentSession>, String> {
    validate_absolute_path(&project_cwd, "project_cwd", false)?;
    Ok(session_scanner::list_sessions(&project_cwd))
}

#[cfg(test)]
mod tests {
    use super::validate_absolute_path;

    #[test]
    fn validate_absolute_path_rejects_relative_paths() {
        let err = validate_absolute_path("relative/path", "cwd", true)
            .expect_err("relative cwd should be rejected");
        assert_eq!(err, "cwd must be an absolute path");
    }

    #[test]
    fn validate_absolute_path_requires_existing_directory() {
        let missing = std::env::temp_dir().join("knkode-missing-dir-for-validation");
        let err = validate_absolute_path(&missing.to_string_lossy(), "cwd", true)
            .expect_err("missing dir should be rejected");
        assert!(err.contains("cwd does not exist or is not a directory"));
    }
}
