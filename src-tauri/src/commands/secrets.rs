use super::{CommandError, CommandResult};

/// Usluga w keychainie systemowym. Jedna na aplikacje; klucz = nazwa wpisu.
const SERVICE: &str = "pl.toolier.app";

/// Maksymalny rozmiar JEDNEGO kawalka sekretu w bajtach UTF-8.
///
/// Windows Credential Manager przyjmuje najwyzej ~2560 bajtow na wpis, a sesja
/// Supabase (dwa tokeny JWT plus obiekt uzytkownika) ma kilka kilobajtow —
/// zapis w calosci po prostu sie nie udaje. Dlatego dzielimy wartosc na
/// kawalki. Limit jest ustawiony z zapasem, bo backend Windows zapisuje
/// haslo w UTF-16, czyli zajmuje ono dwa razy wiecej miejsca.
const CHUNK_BYTES: usize = 1000;

fn entry(key: &str) -> CommandResult<keyring::Entry> {
    keyring::Entry::new(SERVICE, key).map_err(|e| CommandError::Keychain(e.to_string()))
}

/// Wpis trzymajacy kolejny kawalek wartosci.
fn chunk_key(key: &str, index: usize) -> String {
    format!("{key}#{index}")
}

/// Dzieli tekst na kawalki nieprzekraczajace `limit` bajtow, nigdy nie tnac
/// w srodku znaku — inaczej UTF-8 rozsypalby sie na polskich literach.
fn split_utf8(value: &str, limit: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut current = String::new();

    for character in value.chars() {
        if current.len() + character.len_utf8() > limit && !current.is_empty() {
            chunks.push(std::mem::take(&mut current));
        }
        current.push(character);
    }
    chunks.push(current);
    chunks
}

fn read_chunk_count(key: &str) -> CommandResult<Option<usize>> {
    match entry(key)?.get_password() {
        Ok(raw) => raw
            .parse::<usize>()
            .map(Some)
            .map_err(|_| CommandError::Keychain(format!("Uszkodzony licznik kawalkow dla {key}"))),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(CommandError::Keychain(e.to_string())),
    }
}

/// Zapisuje sekret (token sesji Supabase) w keychainie systemu.
/// Refresh token nie ma prawa wyladowac w localStorage webview.
#[tauri::command]
pub fn secret_set(key: String, value: String) -> CommandResult<()> {
    // Najpierw sprzatamy poprzedni zapis — nowy moze miec mniej kawalkow,
    // a osierocone resztki psulyby pozniejszy odczyt.
    secret_delete(key.clone())?;

    let chunks = split_utf8(&value, CHUNK_BYTES);
    for (index, chunk) in chunks.iter().enumerate() {
        entry(&chunk_key(&key, index))?
            .set_password(chunk)
            .map_err(|e| CommandError::Keychain(e.to_string()))?;
    }

    // Licznik zapisujemy NA KONCU: dopoki go nie ma, odczyt zwraca `None`
    // zamiast skladac niekompletna wartosc.
    entry(&key)?
        .set_password(&chunks.len().to_string())
        .map_err(|e| CommandError::Keychain(e.to_string()))
}

/// Zwraca sekret albo `None`, jesli wpisu nie ma (brak wpisu to nie blad).
#[tauri::command]
pub fn secret_get(key: String) -> CommandResult<Option<String>> {
    let Some(count) = read_chunk_count(&key)? else {
        return Ok(None);
    };

    let mut value = String::new();
    for index in 0..count {
        match entry(&chunk_key(&key, index))?.get_password() {
            Ok(chunk) => value.push_str(&chunk),
            // Brakujacy kawalek = zapis niespojny. Lepiej udac brak sesji
            // i kazac sie zalogowac, niz oddac obciety token.
            Err(keyring::Error::NoEntry) => return Ok(None),
            Err(e) => return Err(CommandError::Keychain(e.to_string())),
        }
    }

    Ok(Some(value))
}

/// Kasuje sekret. Brak wpisu traktujemy jako sukces — wylogowanie ma byc idempotentne.
#[tauri::command]
pub fn secret_delete(key: String) -> CommandResult<()> {
    let count = read_chunk_count(&key).unwrap_or(None).unwrap_or(0);

    for index in 0..count {
        match entry(&chunk_key(&key, index))?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => {}
            Err(e) => return Err(CommandError::Keychain(e.to_string())),
        }
    }

    match entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
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

    /// Regresja: prawdziwa sesja Supabase ma kilka kilobajtow, a Windows
    /// Credential Manager przyjmuje ~2560 bajtow na wpis. Poprzednia wersja
    /// zapisywala wartosc w calosci i po cichu sie wywracala — aplikacja
    /// logowala uzytkownika, po czym wysylala zapytania bez tokenu.
    #[test]
    fn zapisuje_sekret_wiekszy_niz_limit_wpisu() {
        let key = test_key("duzy");
        // ~6 kB, czyli tyle, ile potrafi miec realna sesja z obiektem uzytkownika.
        let duzy: String = "eyJhbGciOiJIUzI1NiJ9.".repeat(300);
        assert!(duzy.len() > 2560, "test musi przekraczac limit wpisu");

        secret_set(key.clone(), duzy.clone()).expect("zapis");
        assert_eq!(secret_get(key.clone()).expect("odczyt"), Some(duzy));

        secret_delete(key.clone()).expect("kasowanie");
        assert_eq!(secret_get(key).expect("odczyt po kasowaniu"), None);
    }

    /// Polskie znaki sa wielobajtowe — podzial nie moze ciac w srodku znaku.
    #[test]
    fn nie_psuje_znakow_wielobajtowych() {
        let key = test_key("utf8");
        let tekst = "zażółć gęślą jaźń ".repeat(400);

        secret_set(key.clone(), tekst.clone()).expect("zapis");
        assert_eq!(secret_get(key.clone()).expect("odczyt"), Some(tekst));

        secret_delete(key).expect("sprzatanie");
    }

    /// Krotsza wartosc po dluzszej nie moze zostawic osieroconych kawalkow.
    #[test]
    fn nadpisanie_krotsza_wartoscia_sprzata_kawalki() {
        let key = test_key("shrink");
        secret_set(key.clone(), "x".repeat(5000)).expect("zapis dlugi");
        secret_set(key.clone(), "krotka".into()).expect("zapis krotki");

        assert_eq!(secret_get(key.clone()).expect("odczyt"), Some("krotka".into()));

        secret_delete(key).expect("sprzatanie");
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
