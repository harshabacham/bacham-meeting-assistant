# BACHAM Native Messaging Setup

To allow the Chrome Extension to communicate with the BACHAM Desktop Application, Chrome needs to know where the desktop executable is located and explicitly allow it.

## Prerequisites

1. **Visual Studio C++ Build Tools**: Since the Desktop App is written in Rust, you must install the MSVC build tools to compile it. Download the [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), run the installer, and select "Desktop development with C++".
2. **Compile the Desktop App**:
   Open a terminal, navigate to `apps/desktop`, and run:
   ```powershell
   pnpm tauri build --debug
   ```
   This will generate `apps/desktop/src-tauri/target/debug/desktop.exe`.

## Registration Steps

1. **Get the Extension ID**:
   - Open Chrome and go to `chrome://extensions`.
   - Enable "Developer mode" in the top right.
   - Click "Load unpacked" and select the `apps/extension/dist` folder.
   - Copy the 32-character **ID** assigned to the BACHAM extension.

2. **Run the Connection Script**:
   Open PowerShell and run the setup script, passing the Extension ID you copied:
   ```powershell
   cd apps/desktop/scripts
   .\connect_native_messaging.ps1 -ExtensionId "YOUR_EXTENSION_ID_HERE"
   ```

3. **Verify**:
   The script will create a `com.bacham.dev.json` manifest and register it in the Windows Registry under `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.bacham.dev`.

Once complete, the Chrome extension will automatically launch the desktop application in the background when a lecture capture session starts!
