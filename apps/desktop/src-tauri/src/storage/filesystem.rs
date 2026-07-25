use std::path::PathBuf;
use serde::Serialize;
use crate::error::{AppResult, AppError};

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
    std::fs::create_dir_all(&layout.logs)?;
    std::fs::create_dir_all(&layout.settings)?;
    std::fs::create_dir_all(&layout.temp)?;

    Ok(layout)
}

pub fn move_storage(old_root: &PathBuf, new_root: &PathBuf) -> AppResult<()> {
    if new_root.exists() {
        return Err(AppError::Internal("Target directory already exists".into()));
    }
    
    std::fs::rename(old_root, new_root)?;
    Ok(())
}
