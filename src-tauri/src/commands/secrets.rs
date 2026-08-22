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

#[cfg(test)]
mod tests {
    use super::*;

    /// Klucz testowy z losowym sufiksem — zeby rownolegle testy nie deptaly sobie
    /// po wpisach w prawdziwym magazynie poswiadczen systemu.
    fn test_key(name: &str) -> String {
        format!(
            "test-{}-{}",
            name,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        )
    }

    #[test]
    fn zapisuje_i_odczytuje_sekret() {
        let key = test_key("roundtrip");
        secret_set(key.clone(), "token-sesji".into()).expect("zapis");

        assert_eq!(secret_get(key.clone()).expect("odczyt"), Some("token-sesji".into()));

        secret_delete(key).expect("kasowanie");
    }

    #[test]
    fn brak_wpisu_to_none_a_nie_blad() {
        let key = test_key("missing");
        assert_eq!(secret_get(key).expect("odczyt"), None);
    }

    #[test]
    fn kasowanie_czysci_wpis_i_jest_idempotentne() {
        let key = test_key("delete");
        secret_set(key.clone(), "do-skasowania".into()).expect("zapis");

        secret_delete(key.clone()).expect("pierwsze kasowanie");
        assert_eq!(secret_get(key.clone()).expect("odczyt po kasowaniu"), None);

        // Wylogowanie musi dzialac takze wtedy, gdy sesji juz nie ma.
        secret_delete(key).expect("drugie kasowanie");
    }

    #[test]
    fn nadpisuje_istniejacy_sekret() {
        let key = test_key("overwrite");
        secret_set(key.clone(), "stary".into()).expect("zapis 1");
        secret_set(key.clone(), "nowy".into()).expect("zapis 2");

        assert_eq!(secret_get(key.clone()).expect("odczyt"), Some("nowy".into()));

        secret_delete(key).expect("sprzatanie");
    }
}
