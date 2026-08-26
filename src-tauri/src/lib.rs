mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_deep_link::init())
            // Updater sprawdza podpis paczki kluczem publicznym z tauri.conf.json.
            // Bez poprawnego podpisu aktualizacja jest odrzucana — to jest cała
            // ochrona tego kanału, więc klucz prywatny nie ma prawa trafić do repo.
            .plugin(tauri_plugin_updater::Builder::new().build())
            // Potrzebny do restartu po instalacji.
            .plugin(tauri_plugin_process::init())
            // Lokalna baza offline (T-29). Schemat zaklada aplikacja przy
            // starcie — migracje wtyczki wymagalyby trzymania SQL-a w Rust,
            // a caly stan offline zyje w warstwie `src/data/offline`.
            .plugin(tauri_plugin_sql::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::files::save_file,
            commands::files::read_file,
            commands::files::open_path,
            commands::secrets::secret_set,
            commands::secrets::secret_get,
            commands::secrets::secret_delete
        ])
        .run(tauri::generate_context!())
        .expect("błąd uruchomienia aplikacji Tauri");
}
