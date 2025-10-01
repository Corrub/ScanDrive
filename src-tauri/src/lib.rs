use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use sysinfo::Disks;
use tauri::Emitter;

// Data structures matching TypeScript interfaces
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Drive {
    name: String,
    path: String,
    #[serde(rename = "totalSpace")]
    total_space: String,
    #[serde(rename = "usedSpace")]
    used_space: String,
    #[serde(rename = "freeSpace")]
    free_space: String,
    #[serde(rename = "usagePercentage")]
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
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FileItem>>,
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
        
        // On macOS, try to get more accurate usage information
        // by using statvfs which includes purgeable space in calculations
        #[cfg(target_os = "macos")]
        let (used, actual_available) = {
            use std::ffi::CString;
            use std::mem::MaybeUninit;
            
            let path = disk.mount_point();
            let path_c = CString::new(path.to_string_lossy().as_bytes()).unwrap();
            
            unsafe {
                let mut stats = MaybeUninit::<libc::statvfs>::uninit();
                if libc::statvfs(path_c.as_ptr(), stats.as_mut_ptr()) == 0 {
                    let stats = stats.assume_init();
                    let block_size = stats.f_frsize as u64;
                    let total_blocks = stats.f_blocks as u64;
                    let free_blocks = stats.f_bfree as u64; // Free blocks (including reserved)
                    let available_blocks = stats.f_bavail as u64; // Available to non-root
                    
                    let total_bytes = total_blocks * block_size;
                    let free_bytes = free_blocks * block_size;
                    let used_bytes = total_bytes.saturating_sub(free_bytes);
                    let available_bytes = available_blocks * block_size;
                    
                    (used_bytes, available_bytes)
                } else {
                    // Fallback to sysinfo calculation
                    (total - available, available)
                }
            }
        };
        
        #[cfg(not(target_os = "macos"))]
        let (used, actual_available) = (total - available, available);
        
        let usage_percentage = if total > 0 {
            (used as f64 / total as f64 * 100.0) as f32
        } else {
            0.0
        };

        // Format drive name - make it more descriptive for Windows drives
        let disk_name = disk.name().to_string_lossy().into_owned();
        let mount_point = disk.mount_point().to_string_lossy().into_owned();
        let display_name = if disk_name.is_empty() || disk_name.trim().is_empty() {
            // For Windows drives like C:, D:, etc., create a better name
            #[cfg(target_os = "windows")]
            {
                if mount_point.len() >= 2 && mount_point.chars().nth(1) == Some(':') {
                    let drive_letter = mount_point.chars().next().unwrap();
                    format!("Local Disk ({}:)", drive_letter)
                } else {
                    mount_point.clone()
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                mount_point.clone()
            }
        } else {
            disk_name
        };

        drives.push(Drive {
            name: display_name,
            path: mount_point,
            total_space: format_bytes(total),
            used_space: format_bytes(used),
            free_space: format_bytes(actual_available),
            usage_percentage,
        });
    }

    Ok(drives)
}

// Calculate directory size recursively (with depth limit for performance)
fn calculate_dir_size(path: &Path, max_depth: usize, current_depth: usize) -> u64 {
    if current_depth > max_depth {
        return 0;
    }
    
    let mut total_size = 0u64;
    
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    total_size += calculate_dir_size(&entry.path(), max_depth, current_depth + 1);
                } else {
                    total_size += metadata.len();
                }
            }
        }
    }
    
    total_size
}

// Scan a drive and show root-level folders with their sizes (parallel processing)
#[tauri::command]
async fn scan_drive<R: tauri::Runtime>(
    window: tauri::Window<R>,
    path: String,
) -> Result<String, String> {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;
    use rayon::prelude::*;

    let counter = Arc::new(AtomicU64::new(0));
    let window_clone = window.clone();
    
    std::thread::spawn(move || {
        // Read all entries first
        let entries: Vec<_> = if let Ok(entries) = fs::read_dir(&path) {
            entries.flatten().collect()
        } else {
            Vec::new()
        };
        
        // Process in parallel for speed
        let root_items: Vec<FileItem> = entries
            .par_iter()
            .filter_map(|entry| {
                let entry_path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                
                // Skip hidden/system folders
                if name.starts_with('.') {
                    return None;
                }
                
                // Emit progress periodically
                let count = counter.fetch_add(1, Ordering::Relaxed);
                if count % 5 == 0 {
                    let _ = window_clone.emit("scan-progress", ScanProgress {
                        current_path: entry_path.to_string_lossy().to_string(),
                        files_scanned: count,
                        progress: 0.0,
                    });
                }
                
                let metadata = entry.metadata().ok()?;
                
                let (size_bytes, item_type) = if metadata.is_dir() {
                    // Calculate directory size with limited depth for speed
                    let size = calculate_dir_size(&entry_path, 5, 0);
                    (size, "directory".to_string())
                } else {
                    (metadata.len(), entry_path.extension()
                        .and_then(|ext| ext.to_str())
                        .map(|ext| ext.to_lowercase())
                        .unwrap_or_else(|| "file".to_string()))
                };
                
                Some(FileItem {
                    id: entry_path.to_string_lossy().to_string(),
                    name,
                    size: format_bytes(size_bytes),
                    size_bytes,
                    item_type,
                    path: entry_path.to_string_lossy().to_string(),
                    last_modified: None,
                    children: None,
                })
            })
            .collect();
        
        // Sort by size (largest first)
        let mut sorted_items = root_items;
        sorted_items.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        
        let _ = window_clone.emit("scan-complete", sorted_items);
        
        let final_count = counter.load(Ordering::Relaxed);
        let _ = window_clone.emit("scan-progress", ScanProgress {
            current_path: "Complete".to_string(),
            files_scanned: final_count,
            progress: 100.0,
        });
    });

    Ok("Scan started".to_string())
}

// Get directory contents with calculated sizes (async to prevent UI freeze)
#[tauri::command]
async fn get_directory_contents(path: String) -> Result<Vec<FileItem>, String> {
    use rayon::prelude::*;
    
    let dir_path = Path::new(&path);
    
    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    // Read directory entries first (fast)
    let entries: Vec<_> = match fs::read_dir(dir_path) {
        Ok(entries) => entries.flatten().collect(),
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    };

    // Process entries in parallel using rayon
    let items: Vec<FileItem> = entries
        .par_iter()
        .filter_map(|entry| {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden files
            if name.starts_with('.') {
                return None;
            }
            
            let metadata = entry.metadata().ok()?;

            let (size_bytes, item_type) = if metadata.is_dir() {
                // Calculate directory size with limited depth (3 levels)
                let size = calculate_dir_size(&path, 3, 0);
                (size, "directory".to_string())
            } else {
                (metadata.len(), path.extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext.to_lowercase())
                    .unwrap_or_else(|| "file".to_string()))
            };

            Some(FileItem {
                id: path.to_string_lossy().to_string(),
                name,
                size: format_bytes(size_bytes),
                size_bytes,
                item_type,
                path: path.to_string_lossy().to_string(),
                last_modified: None,
                children: None,
            })
        })
        .collect();

    // Sort by size (largest first)
    let mut sorted_items = items;
    sorted_items.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));

    Ok(sorted_items)
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
