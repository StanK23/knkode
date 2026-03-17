use alacritty_terminal::event::Notify;
use alacritty_terminal::event::{Event, EventListener, WindowSize};
use alacritty_terminal::event_loop::{EventLoop, Notifier};
use alacritty_terminal::grid::Dimensions;
use alacritty_terminal::index::{Column, Line};
use alacritty_terminal::sync::FairMutex;
use alacritty_terminal::term::test::TermSize;
use alacritty_terminal::term::{Config as TermConfig, Term};
use alacritty_terminal::tty;
use std::sync::mpsc;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

#[derive(Clone)]
struct TestEventProxy(mpsc::Sender<Event>);

impl EventListener for TestEventProxy {
    fn send_event(&self, event: Event) {
        let _ = self.0.send(event);
    }
}

struct TestSize {
    cols: u16,
    rows: u16,
}

impl Dimensions for TestSize {
    fn total_lines(&self) -> usize {
        self.screen_lines()
    }

    fn screen_lines(&self) -> usize {
        self.rows as usize
    }

    fn columns(&self) -> usize {
        self.cols as usize
    }

    fn last_column(&self) -> Column {
        Column(self.cols as usize - 1)
    }

    fn bottommost_line(&self) -> Line {
        Line(self.rows as i32 - 1)
    }
}

fn setup_terminal() -> (
    Arc<FairMutex<Term<TestEventProxy>>>,
    Notifier,
    mpsc::Receiver<Event>,
) {
    let (event_tx, event_rx) = mpsc::channel();
    let event_proxy = TestEventProxy(event_tx);

    let config = TermConfig::default();
    let size = TestSize { cols: 80, rows: 24 };
    let window_size = WindowSize {
        num_lines: 24,
        num_cols: 80,
        cell_width: 8,
        cell_height: 16,
    };

    let pty_config = tty::Options::default();
    let pty = tty::new(&pty_config, window_size, 0).expect("Failed to create PTY");

    let term = Term::new(config, &size, event_proxy.clone());
    let term = Arc::new(FairMutex::new(term));

    let event_loop = EventLoop::new(term.clone(), event_proxy, pty, false, false)
        .expect("Failed to create event loop");
    let notifier = Notifier(event_loop.channel());

    let _handle = event_loop.spawn();

    (term, notifier, event_rx)
}

#[test]
fn test_pty_spawns_and_produces_output() {
    let (_term, _notifier, event_rx) = setup_terminal();

    // Shell should produce a Wakeup event when it starts (prompt output).
    let mut got_wakeup = false;
    for _ in 0..50 {
        match event_rx.recv_timeout(Duration::from_millis(100)) {
            Ok(Event::Wakeup) => {
                got_wakeup = true;
                break;
            }
            Ok(_) => continue,
            Err(_) => continue,
        }
    }
    assert!(got_wakeup, "Expected Wakeup event from shell startup");
}

#[test]
fn test_grid_has_correct_dimensions() {
    let (term, _notifier, _event_rx) = setup_terminal();

    // Give the shell a moment to start.
    thread::sleep(Duration::from_millis(200));

    let term = term.lock();
    let grid = term.grid();
    assert_eq!(grid.columns(), 80);
    assert_eq!(grid.screen_lines(), 24);
}

#[test]
fn test_write_to_terminal_and_read_output() {
    let (term, notifier, event_rx) = setup_terminal();

    // Wait for shell to be ready.
    thread::sleep(Duration::from_millis(500));

    // Send "echo hello\n" to the PTY.
    notifier.notify(b"echo hello\n".to_vec());

    // Wait for output to be processed.
    let mut got_wakeup = false;
    for _ in 0..50 {
        match event_rx.recv_timeout(Duration::from_millis(100)) {
            Ok(Event::Wakeup) => {
                got_wakeup = true;
                break;
            }
            Ok(_) => continue,
            Err(_) => continue,
        }
    }
    assert!(got_wakeup, "Expected output after writing echo command");

    // Give time for the grid to update.
    thread::sleep(Duration::from_millis(200));

    // Check that "hello" appears somewhere in the grid.
    let term = term.lock();
    let grid = term.grid();
    let mut found_hello = false;

    for line_idx in 0..grid.screen_lines() {
        let mut row_text = String::new();
        for col_idx in 0..grid.columns() {
            let cell = &grid[Line(line_idx as i32)][Column(col_idx)];
            row_text.push(cell.c);
        }
        if row_text.contains("hello") {
            found_hello = true;
            break;
        }
    }
    assert!(found_hello, "Expected 'hello' in terminal grid output");
}

#[test]
fn test_terminal_resize() {
    let (term, _notifier, _event_rx) = setup_terminal();

    thread::sleep(Duration::from_millis(200));

    {
        let mut term = term.lock();
        term.resize(TermSize::new(120, 40));
    }

    let term = term.lock();
    let grid = term.grid();
    assert_eq!(grid.columns(), 120);
    assert_eq!(grid.screen_lines(), 40);
}
