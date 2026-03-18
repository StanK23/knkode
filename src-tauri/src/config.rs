use serde_json::{json, Map, Value};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

const CONFIG_DIR_NAME: &str = ".knkode";
const WORKSPACES_FILE: &str = "workspaces.json";
const APP_STATE_FILE: &str = "app-state.json";
const SNIPPETS_FILE: &str = "snippets.json";

const DEFAULT_UNFOCUSED_DIM: f64 = 0.3;
const DEFAULT_BACKGROUND: &str = "#1a1a2e";
const DEFAULT_FOREGROUND: &str = "#e0e0e0";
const DEFAULT_FONT_SIZE: f64 = 14.0;

const CURSOR_STYLES: &[&str] = &["block", "underline", "bar"];
const EFFECT_LEVELS: &[&str] = &["off", "subtle", "medium", "intense"];

const ANSI_KEYS: &[&str] = &[
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
    "brightBlack",
    "brightRed",
    "brightGreen",
    "brightYellow",
    "brightBlue",
    "brightMagenta",
    "brightCyan",
    "brightWhite",
];

/// Resolve the user's home directory.
pub fn home_dir() -> Result<PathBuf, String> {
    dirs::home_dir().ok_or_else(|| "Cannot determine home directory".to_string())
}

fn is_hex_color(s: &str) -> bool {
    let bytes = s.as_bytes();
    if bytes.first() != Some(&b'#') {
        return false;
    }
    let hex = &bytes[1..];
    (hex.len() == 3 || hex.len() == 6) && hex.iter().all(|b| b.is_ascii_hexdigit())
}

fn is_effect_level(v: &Value) -> bool {
    v.as_str()
        .map(|s| EFFECT_LEVELS.contains(&s))
        .unwrap_or(false)
}

/// Migrate workspace themes from legacy `opacity` field to `unfocusedDim`.
/// Converts opacity (0.3-1.0, higher = more visible) to unfocusedDim
/// (0-0.7, higher = more dimmed). Missing values default to DEFAULT_UNFOCUSED_DIM.
fn migrate_theme(mut ws: Value) -> Value {
    let theme = match ws.get_mut("theme").and_then(|t| t.as_object_mut()) {
        Some(t) => t,
        None => {
            // Invalid or missing theme — replace with defaults
            if let Some(obj) = ws.as_object_mut() {
                obj.insert(
                    "theme".to_string(),
                    json!({
                        "background": DEFAULT_BACKGROUND,
                        "foreground": DEFAULT_FOREGROUND,
                        "fontSize": DEFAULT_FONT_SIZE,
                        "unfocusedDim": DEFAULT_UNFOCUSED_DIM,
                    }),
                );
            }
            return ws;
        }
    };

    // Already migrated
    if theme.contains_key("unfocusedDim") {
        return ws;
    }

    // Convert legacy opacity to unfocusedDim
    let dim = theme
        .get("opacity")
        .and_then(|v| v.as_f64())
        .filter(|o| o.is_finite())
        .map(|o| (1.0 - o).clamp(0.0, 0.7))
        .unwrap_or(DEFAULT_UNFOCUSED_DIM);

    theme.remove("opacity");
    theme.insert("unfocusedDim".to_string(), json!(dim));
    ws
}

/// Migrate legacy boolean effect fields to EffectLevel strings.
/// Converts `animatedGlow: true` → `glowLevel: "medium"`,
/// `scanline: true` → `scanlineLevel: "medium"`, and adds
/// `gradientLevel: "medium"` when gradient string exists without level.
fn migrate_effect_levels(mut ws: Value) -> Value {
    let theme = match ws.get_mut("theme").and_then(|t| t.as_object_mut()) {
        Some(t) => t,
        None => return ws,
    };

    let has_animated_glow = theme.contains_key("animatedGlow");
    let has_scanline = theme.contains_key("scanline");
    let has_gradient_without_level = theme.get("gradient").is_some_and(|v| v.is_string())
        && !theme.contains_key("gradientLevel");

    if !has_animated_glow && !has_scanline && !has_gradient_without_level {
        return ws;
    }

    if has_animated_glow {
        if theme.get("animatedGlow") == Some(&json!(true))
            && !is_effect_level(theme.get("glowLevel").unwrap_or(&Value::Null))
        {
            theme.insert("glowLevel".to_string(), json!("medium"));
        }
        theme.remove("animatedGlow");
    }

    if has_scanline {
        if theme.get("scanline") == Some(&json!(true))
            && !is_effect_level(theme.get("scanlineLevel").unwrap_or(&Value::Null))
        {
            theme.insert("scanlineLevel".to_string(), json!("medium"));
        }
        theme.remove("scanline");
    }

    if has_gradient_without_level {
        theme.insert("gradientLevel".to_string(), json!("medium"));
    }

    ws
}

/// Validate and sanitize PaneTheme fields loaded from disk.
/// Strips invalid values rather than rejecting — config files may be hand-edited.
fn sanitize_theme(raw: &Value) -> Value {
    let obj = match raw.as_object() {
        Some(o) => o,
        None => return default_theme(),
    };

    let mut result = Map::new();

    // Required fields with defaults
    let bg = obj
        .get("background")
        .and_then(|v| v.as_str())
        .filter(|s| is_hex_color(s))
        .unwrap_or(DEFAULT_BACKGROUND);
    result.insert("background".to_string(), json!(bg));

    let fg = obj
        .get("foreground")
        .and_then(|v| v.as_str())
        .filter(|s| is_hex_color(s))
        .unwrap_or(DEFAULT_FOREGROUND);
    result.insert("foreground".to_string(), json!(fg));

    let font_size = obj
        .get("fontSize")
        .and_then(|v| v.as_f64())
        .filter(|n| n.is_finite() && *n > 0.0)
        .unwrap_or(DEFAULT_FONT_SIZE);
    result.insert("fontSize".to_string(), json!(font_size));

    let dim = obj
        .get("unfocusedDim")
        .and_then(|v| v.as_f64())
        .filter(|n| n.is_finite())
        .unwrap_or(DEFAULT_UNFOCUSED_DIM);
    result.insert("unfocusedDim".to_string(), json!(dim));

    // Optional hex color fields
    for field in ["accent", "glow", "cursorColor", "selectionColor"] {
        if let Some(s) = obj.get(field).and_then(|v| v.as_str()) {
            if is_hex_color(s) {
                result.insert(field.to_string(), json!(s));
            }
        }
    }

    // Optional string: fontFamily (strip obviously invalid values)
    if let Some(s) = obj.get("fontFamily").and_then(|v| v.as_str()) {
        if !s.is_empty() && s.len() < 128 && !s.contains([';', '{', '}']) {
            result.insert("fontFamily".to_string(), json!(s));
        }
    }

    // Optional strings: gradient, preset
    if let Some(s) = obj.get("gradient").and_then(|v| v.as_str()) {
        if !s.is_empty() {
            result.insert("gradient".to_string(), json!(s));
        }
    }
    if let Some(s) = obj.get("preset").and_then(|v| v.as_str()) {
        if !s.is_empty() {
            result.insert("preset".to_string(), json!(s));
        }
    }

    // statusBarPosition
    if let Some(s) = obj.get("statusBarPosition").and_then(|v| v.as_str()) {
        if s == "top" || s == "bottom" {
            result.insert("statusBarPosition".to_string(), json!(s));
        }
    }

    // Optional numeric fields
    for field in ["scrollback", "paneOpacity", "lineHeight"] {
        if let Some(n) = obj.get(field).and_then(|v| v.as_f64()) {
            if n.is_finite() {
                result.insert(field.to_string(), json!(n));
            }
        }
    }

    // CursorStyle
    if let Some(s) = obj.get("cursorStyle").and_then(|v| v.as_str()) {
        if CURSOR_STYLES.contains(&s) {
            result.insert("cursorStyle".to_string(), json!(s));
        }
    }

    // EffectLevel fields
    for field in [
        "gradientLevel",
        "glowLevel",
        "scanlineLevel",
        "noiseLevel",
        "scrollbarAccent",
    ] {
        if let Some(v) = obj.get(field) {
            if is_effect_level(v) {
                result.insert(field.to_string(), v.clone());
            }
        }
    }

    // AnsiColors — validate all 16 fields are hex strings
    if let Some(ac) = obj.get("ansiColors").and_then(|v| v.as_object()) {
        let all_valid = ANSI_KEYS.iter().all(|k| {
            ac.get(*k)
                .and_then(|v| v.as_str())
                .is_some_and(|s| is_hex_color(s))
        });
        if all_valid {
            result.insert("ansiColors".to_string(), Value::Object(ac.clone()));
        }
    }

    Value::Object(result)
}

fn default_theme() -> Value {
    json!({
        "background": DEFAULT_BACKGROUND,
        "foreground": DEFAULT_FOREGROUND,
        "fontSize": DEFAULT_FONT_SIZE,
        "unfocusedDim": DEFAULT_UNFOCUSED_DIM,
    })
}

/// Apply the full migration pipeline to a workspace loaded from disk.
fn migrate_workspace(ws: Value) -> Value {
    let ws = migrate_theme(ws);
    let mut ws = migrate_effect_levels(ws);

    // Sanitize the theme in place
    if let Some(theme) = ws.get("theme") {
        let sanitized = sanitize_theme(theme);
        if let Some(obj) = ws.as_object_mut() {
            obj.insert("theme".to_string(), sanitized);
        }
    }

    ws
}

/// Validate a snippet: must have non-empty string id, name, command.
fn is_valid_snippet(v: &Value) -> bool {
    let obj = match v.as_object() {
        Some(o) => o,
        None => return false,
    };
    let has_field = |key: &str| -> bool {
        obj.get(key)
            .and_then(|v| v.as_str())
            .is_some_and(|s| !s.is_empty())
    };
    has_field("id") && has_field("name") && has_field("command")
}

pub struct ConfigStore {
    dir: PathBuf,
    /// Guards all file I/O to prevent concurrent read/write corruption.
    lock: RwLock<()>,
}

impl ConfigStore {
    pub fn new() -> Result<Self, String> {
        let dir = home_dir()?.join(CONFIG_DIR_NAME);
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create config dir: {e}"))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = fs::Permissions::from_mode(0o700);
            fs::set_permissions(&dir, perms)
                .map_err(|e| format!("Failed to set config dir permissions: {e}"))?;
        }
        Ok(Self {
            dir,
            lock: RwLock::new(()),
        })
    }

    // --- Workspaces ---

    pub fn get_workspaces(&self) -> Result<Vec<Value>, String> {
        let _guard = self.acquire_read()?;
        let workspaces = self.read_json_array(&self.path(WORKSPACES_FILE))?;
        Ok(workspaces.into_iter().map(migrate_workspace).collect())
    }

    pub fn save_workspace(&self, workspace: Value) -> Result<(), String> {
        let _guard = self.acquire_write()?;
        let path = self.path(WORKSPACES_FILE);
        let mut workspaces = self.read_json_array(&path)?;

        let id = workspace
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or("Workspace missing 'id' field")?
            .to_string();

        if let Some(pos) = workspaces
            .iter()
            .position(|w| w.get("id").and_then(|v| v.as_str()) == Some(&id))
        {
            workspaces[pos] = workspace;
        } else {
            workspaces.push(workspace);
        }

        self.write_json_atomic(&path, &Value::Array(workspaces))
    }

    pub fn delete_workspace(&self, id: &str) -> Result<(), String> {
        let _guard = self.acquire_write()?;
        let path = self.path(WORKSPACES_FILE);
        let mut workspaces = self.read_json_array(&path)?;
        let original_len = workspaces.len();
        workspaces.retain(|w| w.get("id").and_then(|v| v.as_str()) != Some(id));
        if workspaces.len() == original_len {
            return Err(format!("Workspace '{id}' not found"));
        }
        self.write_json_atomic(&path, &Value::Array(workspaces))
    }

    // --- App State ---

    pub fn get_app_state(&self) -> Result<Value, String> {
        let _guard = self.acquire_read()?;
        self.read_json_object(&self.path(APP_STATE_FILE))
    }

    pub fn save_app_state(&self, state: Value) -> Result<(), String> {
        if !state.is_object() {
            return Err("Expected JSON object for app state".to_string());
        }
        let _guard = self.acquire_write()?;
        self.write_json_atomic(&self.path(APP_STATE_FILE), &state)
    }

    // --- Snippets ---

    pub fn get_snippets(&self) -> Result<Vec<Value>, String> {
        let _guard = self.acquire_read()?;
        let snippets = self.read_json_array(&self.path(SNIPPETS_FILE))?;
        Ok(snippets.into_iter().filter(is_valid_snippet).collect())
    }

    pub fn save_snippets(&self, snippets: Vec<Value>) -> Result<(), String> {
        let _guard = self.acquire_write()?;
        self.write_json_atomic(&self.path(SNIPPETS_FILE), &Value::Array(snippets))
    }

    // --- Internal helpers ---

    fn path(&self, filename: &str) -> PathBuf {
        self.dir.join(filename)
    }

    fn acquire_read(&self) -> Result<std::sync::RwLockReadGuard<'_, ()>, String> {
        self.lock
            .read()
            .map_err(|e| format!("Config lock poisoned: {e}"))
    }

    fn acquire_write(&self) -> Result<std::sync::RwLockWriteGuard<'_, ()>, String> {
        self.lock
            .write()
            .map_err(|e| format!("Config lock poisoned: {e}"))
    }

    /// Read and parse a JSON file, returning `None` on NotFound.
    /// On corrupt JSON, backs up the file to `{path}.corrupt` and returns `None`.
    fn read_file(&self, path: &Path) -> Result<Option<Value>, String> {
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(format!("Failed to read {}: {e}", path.display())),
        };

        match serde_json::from_str(&content) {
            Ok(parsed) => Ok(Some(parsed)),
            Err(e) => {
                eprintln!(
                    "[config-store] Corrupt JSON in {}, backing up: {e}",
                    path.display()
                );
                let mut backup = path.as_os_str().to_owned();
                backup.push(".corrupt");
                if let Err(copy_err) = fs::copy(path, &backup) {
                    eprintln!("[config-store] Failed to backup corrupt file: {copy_err}");
                }
                Ok(None)
            }
        }
    }

    /// Read a JSON array from disk. Returns empty array if file doesn't exist.
    fn read_json_array(&self, path: &Path) -> Result<Vec<Value>, String> {
        match self.read_file(path)? {
            Some(Value::Array(arr)) => Ok(arr),
            Some(_) => Err(format!("Expected JSON array in {}", path.display())),
            None => Ok(vec![]),
        }
    }

    /// Read a JSON object from disk. Returns empty object if file doesn't exist.
    fn read_json_object(&self, path: &Path) -> Result<Value, String> {
        match self.read_file(path)? {
            Some(val @ Value::Object(_)) => Ok(val),
            Some(_) => Err(format!("Expected JSON object in {}", path.display())),
            None => Ok(Value::Object(Default::default())),
        }
    }

    /// Write JSON to a temp file then rename for atomicity.
    fn write_json_atomic(&self, path: &Path, value: &Value) -> Result<(), String> {
        let mut tmp_os = path.as_os_str().to_owned();
        tmp_os.push(".tmp");
        let tmp_path = PathBuf::from(tmp_os);

        let content = serde_json::to_string_pretty(value)
            .map_err(|e| format!("Failed to serialize JSON: {e}"))?;
        fs::write(&tmp_path, content)
            .map_err(|e| format!("Failed to write {}: {e}", tmp_path.display()))?;
        fs::rename(&tmp_path, path).map_err(|e| {
            let _ = fs::remove_file(&tmp_path);
            format!(
                "Failed to rename {} -> {}: {e}",
                tmp_path.display(),
                path.display()
            )
        })?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = fs::Permissions::from_mode(0o600);
            if let Err(e) = fs::set_permissions(path, perms) {
                eprintln!(
                    "[config-store] Failed to set file permissions on {}: {e}",
                    path.display()
                );
            }
        }
        Ok(())
    }
}
