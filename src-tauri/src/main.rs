// Ukrywa dodatkową konsolę na Windows w buildzie release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    anzorge_lib::run()
}
