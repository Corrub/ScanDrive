use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use sysinfo::Disks;
use tauri::Emitter;
use walkdir::WalkDir;

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileItem {
    id: String,
    name: String,
    size: String,
    size_bytes: u64,
    #[serde(rename = "type")]
    item_type: String,
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_modified: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScanProgress {
    current_path: String,
    files_scanned: u64,
    progress: f32,
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

    for disk in disks.iter() {
        let total = disk.total_space();
        let available = disk.available_space();
        let used = total - available;
        let usage_percentage = if total > 0 {
            (used as f64 / total as f64 * 100.0) as f32
        } else {
            0.0
        };

        drives.push(Drive {
            name: disk.name().to_string_lossy().into_owned(),
            path: disk.mount_point().to_string_lossy().into_owned(),
            total_space: format_bytes(total),
            used_space: format_bytes(used),
            free_space: format_bytes(available),
            usage_percentage,
        });
    }

    Ok(drives)
}

// Scan a drive/directory recursively
#[tauri::command]
async fn scan_drive<R: tauri::Runtime>(
    window: tauri::Window<R>,
    path: String,
) -> Result<String, String> {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;

    let counter = Arc::new(AtomicU64::new(0));
    
    // Clone window for the thread
    let window_clone = window.clone();
    
    std::thread::spawn(move || {
        let walker = WalkDir::new(&path)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| {
                // Skip common protected directories on macOS
                let path_str = e.path().to_string_lossy();
                !path_str.contains("/.Spotlight-V100") &&
                !path_str.contains("/.Trashes") &&
                !path_str.contains("/.fseventsd")
            });

        for entry in walker {
            match entry {
                Ok(entry) => {
                    let count = counter.fetch_add(1, Ordering::Relaxed);
                    
                    // Emit progress every 100 files
                    if count % 100 == 0 {
                        let _ = window_clone.emit("scan-progress", ScanProgress {
                            current_path: entry.path().to_string_lossy().to_string(),
                            files_scanned: count,
                            progress: 0.0, // Can't determine total in advance
                        });
                    }
                }
                Err(e) => {
                    // Silently skip permission denied errors
                    if e.io_error().map_or(false, |err| err.kind() == std::io::ErrorKind::PermissionDenied) {
                        continue;
                    }
                }
            }
        }

        // Emit final count
        let final_count = counter.load(Ordering::Relaxed);
        let _ = window_clone.emit("scan-complete", ScanProgress {
            current_path: "Complete".to_string(),
            files_scanned: final_count,
            progress: 100.0,
        });
    });

    Ok("Scan started".to_string())
}

// Get directory contents
#[tauri::command]
fn get_directory_contents(path: String) -> Result<Vec<FileItem>, String> {
    let dir_path = Path::new(&path);
    
    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    let mut items = Vec::new();
    
    match fs::read_dir(dir_path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                let metadata = match entry.metadata() {
                    Ok(m) => m,
                    Err(_) => continue, // Skip if we can't read metadata
                };

                let size_bytes = metadata.len();
                let item_type = if metadata.is_dir() {
                    "directory".to_string()
                } else {
                    path.extension()
                        .and_then(|ext| ext.to_str())
                        .map(|ext| ext.to_lowercase())
                        .unwrap_or_else(|| "file".to_string())
                };

                let last_modified = metadata.modified()
                    .ok()
                    .and_then(|time| {
                        let datetime: chrono::DateTime<chrono::Local> = time.into();
                        Some(datetime.format("%Y-%m-%d %H:%M:%S").to_string())
                    });

                items.push(FileItem {
                    id: path.to_string_lossy().to_string(),
                    name: entry.file_name().to_string_lossy().to_string(),
                    size: format_bytes(size_bytes),
                    size_bytes,
                    item_type,
                    path: path.to_string_lossy().to_string(),
                    last_modified,
                });
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    // Sort: directories first, then by name
    items.sort_by(|a, b| {
        if a.item_type == "directory" && b.item_type != "directory" {
            std::cmp::Ordering::Less
        } else if a.item_type != "directory" && b.item_type == "directory" {
            std::cmp::Ordering::Greater
        } else {
            a.name.cmp(&b.name)
        }
    });

    Ok(items)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_drives,
            scan_drive,
            get_directory_contents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
