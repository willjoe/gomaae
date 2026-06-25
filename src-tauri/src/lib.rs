use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent};
use tauri::menu::{MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};
use tauri_plugin_updater::UpdaterExt;
use log::{error, info};
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

// Holds the latest available update so JS can query it on mount even if the
// `update-available` event fires before the listener is registered.
struct PendingUpdate(Mutex<Option<serde_json::Value>>);

/// Returns the pending update payload stored during the background check,
/// so the banner can populate itself even if it missed the initial event.
#[tauri::command]
fn get_pending_update(state: tauri::State<'_, PendingUpdate>) -> Option<serde_json::Value> {
    state.0.lock().unwrap().clone()
}

/// Called by the frontend after the user confirms. Downloads, installs, restarts.
#[tauri::command]
async fn install_update(handle: tauri::AppHandle) -> Result<(), String> {
    let endpoint = UPDATE_ENDPOINT.parse().map_err(|e| format!("Invalid endpoint URL: {e}"))?;
    let updater = handle
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|e| format!("Updater builder error: {e}"))?
        .build()
        .map_err(|e| format!("Updater build error: {e}"))?;

    info!("[updater] checking for update before install…");
    let update = updater
        .check()
        .await
        .map_err(|e| format!("Update check failed: {e}"))?;

    let Some(update) = update else {
        // Already up to date — the banner's PendingUpdate state is stale.
        // Clear it so the banner hides on next poll.
        *handle.state::<PendingUpdate>().0.lock().unwrap() = None;
        return Err("No update available — already on the latest version.".into());
    };

    info!("[updater] downloading and installing {}…", update.version);
    update
        .download_and_install(
            |chunk, total| {
                if let Some(t) = total {
                    info!("[updater] downloaded {}/{} bytes", chunk, t);
                }
            },
            || info!("[updater] download complete, applying update…"),
        )
        .await
        .map_err(|e| format!("Download/install failed: {e}"))?;

    info!("[updater] restarting…");
    handle.restart();

    #[allow(unreachable_code)]
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
        .endpoints(vec![endpoint])
        .and_then(|b| b.build())
    {
        Ok(u) => u,
        Err(e) => { error!("[updater] build failed: {e}"); return; }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            info!("[updater] update available: {}", update.version);
            let payload = serde_json::json!({
                "version": update.version,
                "notes": update.body.unwrap_or_default(),
            });
            // Persist so JS can poll via get_pending_update as fallback.
            *handle.state::<PendingUpdate>().0.lock().unwrap() = Some(payload.clone());
            let _ = handle.emit("update-available", payload);
        }
        Ok(None) => info!("[updater] already up to date"),
        Err(e) => error!("[updater] check failed: {e}"),
    }
}

/// Build the macOS application menu.
/// A "View → Reload  ⌘R" item is wired to `window.location.reload()` via
/// the `on_menu_event` handler below. The rest are standard predefined items
/// so the system-level keyboard shortcuts (Cmd+C/V/Z/Q/H/M/W) keep working.
fn build_menu(app: &tauri::App) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let app_menu = SubmenuBuilder::new(app, "Gomaae")
        .item(&PredefinedMenuItem::about(app, None, None)?)
        .separator()
        .item(&PredefinedMenuItem::services(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let reload_item = MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?;
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&reload_item)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    MenuBuilder::new(app)
        .item(&app_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&window_menu)
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .manage(SidecarProcess(Mutex::new(None)))
    .manage(PendingUpdate(Mutex::new(None)))
    .invoke_handler(tauri::generate_handler![install_update, get_pending_update])
    .on_menu_event(|app, event| {
      if event.id() == "reload" {
        if let Some(window) = app.get_webview_window("main") {
          let _ = window.eval("window.location.reload()");
        }
      }
    })
    .setup(|app| {
      // Log to file in all builds so the update check is always traceable.
      // Location: ~/Library/Logs/com.gomaae.app/gomaae.log (macOS)
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;

      // macOS menu bar (View → Reload  ⌘R).
      let menu = build_menu(app)?;
      app.set_menu(menu)?;

      // Check for updates on launch, then again every hour.
      // 10s initial delay: the Node sidecar takes 5-10s to boot and the loading
      // shell redirects only after it's ready. JS also polls get_pending_update
      // every 5s as a belt-and-suspenders fallback.
      let handle = app.handle().clone();
      let _ = std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(10));
        let _ = tauri::async_runtime::spawn(check_for_updates(handle.clone()));
        // Re-check every hour so users learn about releases without restarting.
        loop {
          std::thread::sleep(std::time::Duration::from_secs(3600));
          let _ = tauri::async_runtime::spawn(check_for_updates(handle.clone()));
        }
      });

      // Release only: run the bundled Next standalone server as a sidecar.
      // In dev, the webview loads `devUrl` (the live Next dev server) directly,
      // so no sidecar is needed.
      #[cfg(not(debug_assertions))]
      {
        let resource_dir = app.path().resource_dir()?;
        let server_dir = resource_dir.join("sidecar-dist");
        let server_js = server_dir.join("server.js");

        // Resolve a stable, writable OS app-data directory and pass it to the
        // Next.js sidecar so config.yaml survives app bundle updates.
        let app_data_dir = app.path().app_data_dir()?;
        std::fs::create_dir_all(&app_data_dir)?;

        let (mut rx, child) = app
          .shell()
          .sidecar("node")?
          .current_dir(server_dir)
          .env("PORT", SIDECAR_PORT.to_string())
          .env("HOSTNAME", "127.0.0.1")
          .env("GOMAAE_DATA_DIR", app_data_dir.to_string_lossy().as_ref())
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
