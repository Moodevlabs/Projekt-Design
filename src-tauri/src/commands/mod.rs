pub mod files;

use serde::Serialize;

/// Błąd komendy przekazywany do webview jako string.
#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("Nie udało się zapisać pliku: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Other(String),
}

impl Serialize for CommandError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type CommandResult<T> = Result<T, CommandError>;
