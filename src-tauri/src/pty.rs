use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde_json::json;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

const SHELL_READY_DELAY_MS: u64 = 300;
const READ_BUFFER_SIZE: usize = 8192;

struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    generation: u64,
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
    next_generation: AtomicU64,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            next_generation: AtomicU64::new(1),
        }
    }

    pub fn create(
        &self,
        id: String,
        cwd: String,
        startup_command: Option<String>,
        app: tauri::AppHandle,
    ) -> Result<(), String> {
        // Kill existing session with same ID if present (matches v1 behavior)
        self.kill(&id).ok();

        let generation = self.next_generation.fetch_add(1, Ordering::Relaxed);

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {e}"))?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| {
            if cfg!(windows) {
                "powershell.exe".to_string()
            } else {
                "/bin/sh".to_string()
            }
        });

        let mut cmd = CommandBuilder::new(&shell);
        if !cfg!(windows) {
            cmd.arg("-l");
        }
        cmd.cwd(&cwd);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {e}"))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {e}"))?;
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

        let writer = Arc::new(Mutex::new(writer));

        // Startup command with delay (matches v1's 300ms setTimeout)
        if let Some(cmd_str) = startup_command {
            let writer_clone = Arc::clone(&writer);
            let id_clone = id.clone();
            let sessions_clone = Arc::clone(&self.sessions);
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(SHELL_READY_DELAY_MS));
                // Only write if session still exists (wasn't killed during delay)
                let sessions = sessions_clone.lock().unwrap();
                if sessions.contains_key(&id_clone) {
                    if let Ok(mut w) = writer_clone.lock() {
                        let _ = w.write_all(format!("{cmd_str}\r").as_bytes());
                        let _ = w.flush();
                    }
                }
            });
        }

        // Store session before starting reader (reader needs session in map)
        let session = PtySession {
            writer,
            master: pair.master,
            child,
            generation,
        };
        self.sessions
            .lock()
            .map_err(|e| format!("Session lock poisoned: {e}"))?
            .insert(id.clone(), session);

        // Background reader thread: read PTY output → emit events
        let id_clone = id.clone();
        let sessions_clone = Arc::clone(&self.sessions);
        std::thread::spawn(move || {
            let mut buf = [0u8; READ_BUFFER_SIZE];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app.emit("pty:data", json!({ "id": &id_clone, "data": data }));
                    }
                    Err(_) => break,
                }
            }

            // PTY closed — get exit code and clean up
            // Remove only if this is still the same generation (prevents race on restart)
            let removed = {
                let mut sessions = sessions_clone.lock().unwrap();
                if sessions
                    .get(&id_clone)
                    .map_or(false, |s| s.generation == generation)
                {
                    sessions.remove(&id_clone)
                } else {
                    None
                }
            };

            // Wait for child outside the lock to avoid blocking other operations
            let exit_code = if let Some(mut session) = removed {
                session
                    .child
                    .wait()
                    .map(|s| s.exit_code() as i32)
                    .unwrap_or(-1)
            } else {
                0
            };

            let _ = app.emit(
                "pty:exit",
                json!({ "id": &id_clone, "exitCode": exit_code }),
            );
        });

        Ok(())
    }

    pub fn write(&self, id: &str, data: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let session = sessions
            .get(id)
            .ok_or_else(|| format!("No PTY session for pane {id}"))?;
        let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("PTY write failed: {e}"))?;
        writer.flush().map_err(|e| format!("PTY flush failed: {e}"))
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        // Silently ignore missing sessions (matches v1 behavior)
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.get(id) {
            session
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("PTY resize failed: {e}"))?;
        }
        Ok(())
    }

    pub fn kill(&self, id: &str) -> Result<(), String> {
        // Silently ignore missing sessions (matches v1 behavior)
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(mut session) = sessions.remove(id) {
            let _ = session.child.kill();
        }
        Ok(())
    }

    pub fn kill_all(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        for (_, mut session) in sessions.drain() {
            let _ = session.child.kill();
        }
    }
}
