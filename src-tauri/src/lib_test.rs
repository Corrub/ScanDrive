use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use sysinfo::Disks;
use tauri::Emitter;
use walkdir::WalkDir;
use chrono::{DateTime, Local};

// Data structures matching TypeScript interfaces
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Drive {
    name: String,
    path: String,
    total_space: String,
    used_space: String,
    free_space: String,
    usage_percentage: f32,
}

// Helper function to format bytes
fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        format!("{:.2} TB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

// Get all available drives
#[tauri::command]
fn get_drives() -> Result<Vec<Drive>, String> {
    let disks = Disks::new_with_refreshed_list();
    let mut drives = Vec::new();

    for disk in disks.list() {
        let total_space = disk.total_space();
        let available_space = disk.available_space();
        let used_space = total_space.saturating_sub(available_space);
        let usage_percentage = if total_space > 0 {
            (used_space as f64 / total_space as f64 * 100.0) as f32
        } else {
            0.0
        };

        let name = disk.name().to_string_lossy().to_string();
        let mount_point = disk.mount_point().to_string_lossy().to_string();

        drives.push(Drive {
            name: if name.is_empty() {
                mount_point.clone()
            } else {
                format!("{} ({})", name, mount_point)
            },
            path: mount_point,
            total_space: format_bytes(total_space),
            used_space: format_bytes(used_space),
            free_space: format_bytes(available_space),
            usage_percentage,
        });
    }

    if drives.is_empty() {
        return Err("No drives found".to_string());
    }

    Ok(drives)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_drives,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
