use std::sync::Mutex;
use tauri::{Manager, RunEvent};
#[allow(unused_imports)]
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
#[allow(unused_imports)]
use tauri_plugin_shell::ShellExt;

// Fixed loopback port the bundled Node sidecar listens on. The loading shell
// (frontend-shell/index.html) polls this and redirects once the server is up.
// Keep this in sync with that file.
#[allow(dead_code)]
const SIDECAR_PORT: u16 = 41730;

// Holds the running sidecar so we can kill it on app exit (no orphaned Node server).
struct SidecarProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .manage(SidecarProcess(Mutex::new(None)))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Release only: run the bundled Next standalone server as a sidecar.
      // In dev, the webview loads `devUrl` (the live Next dev server) directly,
      // so no sidecar is needed.
      #[cfg(not(debug_assertions))]
      {
        let resource_dir = app.path().resource_dir()?;
        let server_dir = resource_dir.join("sidecar-dist");
        let server_js = server_dir.join("server.js");

        let (mut rx, child) = app
          .shell()
          .sidecar("node")?
          .current_dir(server_dir)
          .env("PORT", SIDECAR_PORT.to_string())
          .env("HOSTNAME", "127.0.0.1")
          .args([server_js.to_string_lossy().to_string()])
          .spawn()?;

        app.state::<SidecarProcess>().0.lock().unwrap().replace(child);

        // Drain output so the channel never backpressures; surface errors.
        tauri::async_runtime::spawn(async move {
          while let Some(event) = rx.recv().await {
            if let CommandEvent::Stderr(line) = event {
              eprintln!("[sidecar] {}", String::from_utf8_lossy(&line));
            }
          }
        });
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      // Don't leave an orphaned Node server behind when the app quits.
      if let RunEvent::Exit = event {
        if let Some(child) = app.state::<SidecarProcess>().0.lock().unwrap().take() {
          let _ = child.kill();
        }
      }
    });
}
