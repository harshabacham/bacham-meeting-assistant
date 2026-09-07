use std::path::PathBuf;
use serde::Serialize;
use crate::error::AppResult;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StorageLayout {
    pub root: PathBuf,
    pub data: PathBuf,
    pub logs: PathBuf,
    pub settings: PathBuf,
    pub temp: PathBuf,
}

pub fn initialize_layout(root_path: PathBuf) -> AppResult<StorageLayout> {
    let layout = StorageLayout {
        data: root_path.join("Data"),
        logs: root_path.join("Logs"),
        settings: root_path.join("Settings"),
        temp: root_path.join("Temp"),
        root: root_path,
    };

    std::fs::create_dir_all(&layout.root)?;
    std::fs::create_dir_all(&layout.data)?;
    let _ = std::fs::create_dir_all(layout.data.join("temp"));
    let _ = std::fs::create_dir_all(layout.data.join("videos"));
    let _ = std::fs::create_dir_all(layout.data.join("keyframes"));
    let _ = std::fs::create_dir_all(layout.data.join("screenshots"));
    let _ = std::fs::create_dir_all(layout.root.join("Exports"));
    std::fs::create_dir_all(&layout.logs)?;
    std::fs::create_dir_all(&layout.settings)?;
    std::fs::create_dir_all(&layout.temp)?;

    Ok(layout)
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let dest_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &dest_path)?;
        } else {
            std::fs::copy(entry.path(), dest_path)?;
        }
    }
    Ok(())
}

pub fn move_storage(old_root: &PathBuf, new_root: &PathBuf) -> AppResult<()> {
    if old_root == new_root {
        initialize_layout(new_root.clone())?;
        return Ok(());
    }

    std::fs::create_dir_all(new_root)?;

    if old_root.exists() {
        // Attempt quick rename first (fast within same drive if target is empty/new)
        if std::fs::rename(old_root, new_root).is_err() {
            // Cross-drive or target already exists: copy files recursively
            let _ = copy_dir_recursive(old_root, new_root);
            // Cleanup old directory
            let _ = std::fs::remove_dir_all(old_root);
        }
    }

    initialize_layout(new_root.clone())?;
    Ok(())
}
