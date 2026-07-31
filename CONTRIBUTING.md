# Contributing to Bacham

First off, thank you for considering contributing to Bacham! It's people like you that make Bacham such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please be respectful and welcoming to all contributors.

## Architecture Overview

Bacham uses a standard Tauri architecture:

- `src-tauri/` - Contains the Rust backend. This is where all the heavy lifting happens:
  - SQLite Database management (`sqlx`).
  - Native Screen & Audio Capture logic.
  - Integration with Local LLMs and Cloud AI APIs via traits.
  - File system operations.
- `apps/desktop/src/` - Contains the React frontend (Vite + TypeScript).
  - Built with TailwindCSS and custom UI components.
  - Communicates with the backend exclusively via Tauri IPC (`invoke` and `listen`).

## Development Setup

1. **Install Prerequisites**: You will need Node.js, `pnpm`, and Rust installed. On Windows, you also need the C++ build tools. Follow the [Tauri Prerequisites Guide](https://tauri.app/v1/guides/getting-started/prerequisites).
2. **Clone the repository**: `git clone https://github.com/your-username/bacham.git`
3. **Install Dependencies**: `pnpm install`
4. **Run the Development Server**: `pnpm tauri dev`
   - This command will compile the Rust backend and spin up the Vite dev server for the frontend. Hot-reloading is supported for the frontend!

## How to Contribute

### 1. Find an Issue
Look for open issues tagged with `good first issue` or `help wanted`. If you want to build a new feature, please open an issue first to discuss it with the maintainers.

### 2. Create a Branch
Create a new branch for your feature or bugfix:
```bash
git checkout -b feature/your-feature-name
```
or
```bash
git checkout -b fix/your-bugfix-name
```

### 3. Make your Changes
- Write clean, readable code.
- If you change the Rust backend, run `cargo fmt` and `cargo clippy`.
- If you add new Tauri commands, make sure you expose them correctly in `src-tauri/src/lib.rs` and add the corresponding TypeScript definitions in the frontend client.

### 4. Commit and Push
```bash
git commit -m "feat: add your amazing feature"
git push origin feature/your-feature-name
```

### 5. Open a Pull Request
Go to the repository on GitHub and open a Pull Request. Provide a clear description of what you've changed and why.

## AI & Local Models

If you are contributing to the AI integration layer, ensure that your changes respect the user's choice of models (e.g., fallback gracefully if a local model is unavailable or if a cloud API key is missing).

Happy coding! 🚀
