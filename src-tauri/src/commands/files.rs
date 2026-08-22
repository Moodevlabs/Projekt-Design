use super::{CommandError, CommandResult};
use std::path::PathBuf;
use tauri_plugin_opener::OpenerExt;

/// Zapisuje bajty (np. PDF) pod wskazaną ścieżką wybraną przez użytkownika w dialogu.
/// Dialog otwiera frontend (plugin-dialog), Rust tylko zapisuje — dzięki temu
/// nie potrzebujemy szerokich uprawnień `fs:allow-write`.
#[tauri::command]
pub fn save_file(path: String, contents: Vec<u8>) -> CommandResult<String> {
    let path = PathBuf::from(path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&path, contents)?;
    Ok(path.to_string_lossy().to_string())
}

/// Otwiera plik/katalog w domyślnej aplikacji systemowej.
#[tauri::command]
pub fn open_path(app: tauri::AppHandle, path: String) -> CommandResult<()> {
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| CommandError::Other(e.to_string()))
}
