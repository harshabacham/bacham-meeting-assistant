use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use chrono::Local;

pub fn write_log(log_dir: &PathBuf, level: &str, module: &str, message: &str) {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    let log_line = format!("[{}] [{}] [{}] {}\n", now, level, module, message);
    
    let file_path = log_dir.join("app.log");
    
    // In a full production app we'd keep the file open and rotate it.
    // For Sprint 1, opening and appending is sufficient.
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(file_path) {
        let _ = file.write_all(log_line.as_bytes());
    }
    
    // Also print to stderr for dev
    eprintln!("{}", log_line.trim_end());
}

pub fn info(log_dir: &PathBuf, module: &str, message: &str) {
    write_log(log_dir, "INFO", module, message);
}

pub fn error(log_dir: &PathBuf, module: &str, message: &str) {
    write_log(log_dir, "ERROR", module, message);
}
