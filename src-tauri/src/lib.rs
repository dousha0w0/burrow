mod engine;
mod process;
mod query;
mod runs;
mod space;
mod status;
mod system;

use process::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            status::engine_info,
            status::status_once,
            status::status_watch_start,
            status::status_watch_stop,
            space::analyze,
            space::analyze_cancel,
            query::history,
            query::apps_list,
            runs::run_start,
            runs::run_cancel,
            system::reveal_path,
            system::open_external,
            system::terminal_run,
            system::log_message,
            system::ui_ready,
        ])
        .build(tauri::generate_context!())
        .expect("error while building burrow")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                process::terminate_children(&app.state::<AppState>());
            }
        });
}
