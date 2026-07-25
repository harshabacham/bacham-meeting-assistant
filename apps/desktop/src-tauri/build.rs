fn main() {
    #[cfg(target_os = "windows")]
    {
        // Automatically terminate any running instance of the app to release file locks before compiling
        let _ = std::process::Command::new("taskkill")
            .args(&["/F", "/IM", "appsdesktop.exe"])
            .output();
    }
    tauri_build::build()
}
