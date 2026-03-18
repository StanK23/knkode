use crate::config::ConfigStore;
use serde_json::json;
use std::sync::mpsc;
use std::time::Duration;
use tauri::Manager;

const DEBOUNCE_MS: u64 = 500;
// Must match minWidth/minHeight in tauri.conf.json
const MIN_WINDOW_WIDTH: f64 = 600.0;
const MIN_WINDOW_HEIGHT: f64 = 400.0;

/// Apply platform-specific window effects, restore saved bounds, and show.
///
/// Static config (titleBarStyle, trafficLightPosition, shadow, transparent)
/// lives in `tauri.conf.json`. This function handles:
/// - Platform-conditional effects (macOS translucency, Windows acrylic)
/// - Window bounds restore from app-state.json
/// - Bounds watcher (debounced save on resize/move)
/// - Showing the window after setup completes
pub fn setup_window(app: &tauri::App) {
    let Some(window) = app.get_webview_window("main") else {
        eprintln!("[window] Main window not found during setup");
        return;
    };

    apply_effects(&window);
    restore_bounds(app, &window);
    start_bounds_watcher(app, &window);

    if let Err(e) = window.show() {
        eprintln!("[window] Failed to show window: {e}");
    }
}

/// Apply platform-specific window effects.
fn apply_effects(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "macos")]
    {
        use tauri::window::{Effect, EffectsBuilder};

        let effects = EffectsBuilder::new()
            .effect(Effect::UnderWindowBackground)
            .build();
        if let Err(e) = window.set_effects(effects) {
            eprintln!("[window] Failed to set window effect: {e}");
        }
    }

    #[cfg(target_os = "windows")]
    {
        use tauri::window::{Effect, EffectsBuilder};

        let effects = EffectsBuilder::new().effect(Effect::Acrylic).build();
        if let Err(e) = window.set_effects(effects) {
            eprintln!("[window] Failed to set acrylic: {e}");
        }
        // Force maximizable/resizable — acrylic can gray out window controls
        let _ = window.set_maximizable(true);
        let _ = window.set_resizable(true);
    }

    // Suppress unused variable warning on other platforms
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let _ = window;
}

/// Restore window position and size from app-state.json.
fn restore_bounds(app: &tauri::App, window: &tauri::WebviewWindow) {
    let config = app.state::<ConfigStore>();
    let state = match config.get_app_state() {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[window] Failed to read app state for bounds restore: {e}");
            return;
        }
    };

    let Some(bounds) = state.get("windowBounds") else {
        return;
    };

    let width = bounds.get("width").and_then(|v| v.as_f64());
    let height = bounds.get("height").and_then(|v| v.as_f64());
    let x = bounds.get("x").and_then(|v| v.as_f64());
    let y = bounds.get("y").and_then(|v| v.as_f64());

    if let (Some(w), Some(h)) = (width, height) {
        if w >= MIN_WINDOW_WIDTH && h >= MIN_WINDOW_HEIGHT {
            let _ = window.set_size(tauri::LogicalSize::new(w, h));
        }
    }

    if let (Some(x), Some(y)) = (x, y) {
        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
    }
}

/// Watch for resize/move events and save bounds with debounced writes.
fn start_bounds_watcher(app: &tauri::App, window: &tauri::WebviewWindow) {
    let (tx, rx) = mpsc::channel::<()>();
    let window_clone = window.clone();
    let app_handle = app.handle().clone();

    // Event handler: notify the debounce thread on resize/move
    window.on_window_event(move |event| {
        if matches!(
            event,
            tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_)
        ) {
            let _ = tx.send(());
        }
    });

    // Background thread: debounce then save
    std::thread::Builder::new()
        .name("bounds-watcher".into())
        .spawn(move || {
            let config = app_handle.state::<ConfigStore>();
            loop {
                // Block until first event
                if rx.recv().is_err() {
                    break; // channel closed
                }
                // Drain events until 500ms of quiet
                loop {
                    match rx.recv_timeout(Duration::from_millis(DEBOUNCE_MS)) {
                        Ok(()) => continue,                            // more events — keep waiting
                        Err(mpsc::RecvTimeoutError::Timeout) => break, // quiet — save
                        Err(mpsc::RecvTimeoutError::Disconnected) => return,
                    }
                }
                save_bounds(&window_clone, &config);
            }
        })
        .ok();
}

/// Persist current window bounds (logical units) to app-state.json.
fn save_bounds(window: &tauri::WebviewWindow, config: &ConfigStore) {
    let Ok(size) = window.inner_size() else {
        return;
    };
    let Ok(position) = window.outer_position() else {
        return;
    };
    let Ok(scale) = window.scale_factor() else {
        return;
    };

    // Save as logical (DPI-independent) values for cross-monitor consistency
    let bounds = json!({
        "width": (size.width as f64 / scale).round(),
        "height": (size.height as f64 / scale).round(),
        "x": (position.x as f64 / scale).round(),
        "y": (position.y as f64 / scale).round(),
    });

    if let Err(e) = config.update_app_state_field("windowBounds", bounds) {
        eprintln!("[window] Failed to save window bounds: {e}");
    }
}
