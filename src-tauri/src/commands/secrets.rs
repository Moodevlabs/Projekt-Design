use super::{CommandError, CommandResult};

/// Usługa w keychainie systemowym. Jedna na aplikację; klucz = nazwa wpisu.
const SERVICE: &str = "pl.anzorge.app";

fn entry(key: &str) -> CommandResult<keyring::Entry> {
    keyring::Entry::new(SERVICE, key).map_err(|e| CommandError::Keychain(e.to_string()))
}

/// Zapisuje sekret (token sesji Supabase) w keychainie systemu.
/// Refresh token nie ma prawa wylądować w localStorage webview.
#[tauri::command]
pub fn secret_set(key: String, value: String) -> CommandResult<()> {
    entry(&key)?
        .set_password(&value)
        .map_err(|e| CommandError::Keychain(e.to_string()))
}

/// Zwraca sekret albo `None`, jeśli wpisu nie ma (brak wpisu to nie błąd).
#[tauri::command]
pub fn secret_get(key: String) -> CommandResult<Option<String>> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(CommandError::Keychain(e.to_string())),
    }
}

/// Kasuje sekret. Brak wpisu traktujemy jako sukces — wylogowanie ma być idempotentne.
#[tauri::command]
pub fn secret_delete(key: String) -> CommandResult<()> {
    match entry(&key)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(CommandError::Keychain(e.to_string())),
    }
}
