use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_updater::UpdaterExt;
#[allow(unused_imports)]
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
#[allow(unused_imports)]
use tauri_plugin_shell::ShellExt;

// Fixed loopback port the bundled Node sidecar listens on. The loading shell
// (frontend-shell/index.html) polls this and redirects once the server is up.
// Keep this in sync with that file.
#[allow(dead_code)]
const SIDECAR_PORT: u16 = 41730;

// GitHub Releases latest.json endpoint.
// Requires the repo to be public or a proxy with auth for private repos.
// The check fails silently if unreachable (offline / private).
const UPDATE_ENDPOINT: &str =
    "https://github.com/willjoe/gomaae/releases/latest/download/latest.json";

// Holds the running sidecar so we can kill it on app exit (no orphaned Node server).
struct SidecarProcess(Mutex<Option<CommandChild>>);

/// Called by the frontend after the user confirms. Downloads, installs, restarts.
#[tauri::command]
async fn install_update(handle: tauri::AppHandle) -> Result<(), String> {
    let endpoint = UPDATE_ENDPOINT.parse().map_err(|e| format!("{e}"))?;
    let updater = handle
        .updater_builder()
        .endpoints([endpoint])
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
        handle.restart();
    }
    Ok(())
}

/// Silent background check on every launch.
/// Emits `update-available {version, notes}` to the webview if a newer release exists.
async fn check_for_updates(handle: tauri::AppHandle) {
    let Ok(endpoint) = UPDATE_ENDPOINT.parse() else {
        return;
    };
    let updater = match handle
        .updater_builder()
        .endpoints([endpoint])
        .and_then(|b| b.build())
    {
        Ok(u) => u,
        Err(e) => { eprintln!("[updater] build: {e}"); return; }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            let _ = handle.emit("update-available", serde_json::json!({
                "version": update.version,
                "notes": update.body.unwrap_or_default(),
            }));
        }
        Ok(None) => {}
        Err(e) => eprintln!("[updater] check (offline?): {e}"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .manage(SidecarProcess(Mutex::new(None)))
    .invoke_handler(tauri::generate_handler![install_update])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Check for updates on every launch — background, non-blocking.
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        check_for_updates(handle).await;
      });

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
