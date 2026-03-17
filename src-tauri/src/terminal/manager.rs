use std::collections::HashMap;

use parking_lot::Mutex;
use tauri::AppHandle;

use crate::terminal::instance::TerminalInstance;
use crate::terminal::types::CellGrid;

const MAX_TERMINALS: usize = 16;

/// Manages all active terminal instances.
pub struct TerminalManager {
    terminals: Mutex<HashMap<String, TerminalInstance>>,
}

impl TerminalManager {
    /// Create an empty terminal manager.
    pub fn new() -> Self {
        Self {
            terminals: Mutex::new(HashMap::new()),
        }
    }

    /// Spawn a new terminal and return its UUID. Fails if at capacity.
    pub fn create(&self, app_handle: AppHandle) -> Result<String, String> {
        let mut terminals = self.terminals.lock();
        if terminals.len() >= MAX_TERMINALS {
            return Err(format!("Maximum terminal limit reached ({MAX_TERMINALS})"));
        }

        let id = uuid::Uuid::new_v4().to_string();
        let instance = TerminalInstance::spawn(id.clone(), app_handle)
            .map_err(|e| format!("Failed to spawn terminal: {e}"))?;

        terminals.insert(id.clone(), instance);
        Ok(id)
    }

    /// Write input bytes to a terminal's PTY.
    pub fn write(&self, id: &str, data: &[u8]) -> Result<(), String> {
        let terminals = self.terminals.lock();
        let instance = terminals
            .get(id)
            .ok_or_else(|| format!("Terminal not found: {id}"))?;
        instance.write(data);
        Ok(())
    }

    /// Resize a terminal's grid and PTY.
    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let mut terminals = self.terminals.lock();
        let instance = terminals
            .get_mut(id)
            .ok_or_else(|| format!("Terminal not found: {id}"))?;
        instance.resize(cols, rows)
    }

    /// Snapshot a terminal's visible grid.
    pub fn get_state(&self, id: &str) -> Result<CellGrid, String> {
        let terminals = self.terminals.lock();
        let instance = terminals
            .get(id)
            .ok_or_else(|| format!("Terminal not found: {id}"))?;
        instance.get_state()
    }

    /// Remove and drop a terminal instance, cleaning up its PTY and threads.
    /// The instance is moved out of the map before the lock is released,
    /// then dropped outside the lock so thread joins don't block other commands.
    pub fn remove(&self, id: &str) -> Result<(), String> {
        let instance = {
            let mut terminals = self.terminals.lock();
            terminals
                .remove(id)
                .ok_or_else(|| format!("Terminal not found: {id}"))?
        };
        // instance is dropped here, outside the lock — thread joins won't
        // block get_state/write/resize calls for other terminals.
        drop(instance);
        Ok(())
    }
}
