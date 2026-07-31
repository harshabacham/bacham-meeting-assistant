<div align="center">
  <img src="https://raw.githubusercontent.com/tauri-apps/tauri/HEAD/app-icon.png" width="128" height="128" alt="Bacham Icon" />

  # Bacham
  
  **An Open-Source, Privacy-First AI Meeting & Lecture Assistant.**
  
  [![Tauri](https://img.shields.io/badge/Tauri-V1-FFC131?logo=tauri&logoColor=white)](https://tauri.app/)
  [![Rust](https://img.shields.io/badge/Rust-1.70+-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

  Bacham silently captures your desktop audio and screen during meetings or lectures, uses advanced AI to generate live transcripts and semantic notes, and organizes everything into a beautiful, searchable knowledge base. All powered locally or with Bring-Your-Own-Key (BYOK).

  [Features](#features) • [Getting Started](#getting-started) • [Architecture](#architecture) • [Contributing](#contributing)

</div>

<br/>

## ✨ Features

- **🔴 Native Desktop Capture:** Automatically captures audio and video from your screen without needing clunky bots joining your meeting.
- **🧠 Live AI Transcripts & Summaries:** Generates transcripts on the fly and summarizes them into structured notes.
- **🔍 Universal Smart Search:** Search through hours of meetings by simply typing questions like *"What did we decide about the database migration?"* using embeddings and semantic search.
- **📓 Flashcards & Cram Sheets:** Automatically generates study materials and cheat sheets from educational lectures.
- **🔌 Deep Integrations:** Push tasks directly to Notion, Jira, or Linear.
- **🔒 Privacy First:** Your data belongs to you. Stored locally via SQLite.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You'll need the Tauri prerequisites installed on your machine.
- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/en/) & `pnpm`
- See [Tauri Setup Guide](https://tauri.app/v1/guides/getting-started/prerequisites) for OS-specific dependencies (e.g., C++ build tools on Windows).

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/your-username/bacham.git
   cd bacham
   ```
2. Install dependencies
   ```sh
   pnpm install
   ```
3. Run the development server
   ```sh
   pnpm tauri dev
   ```

## 🏗️ Architecture

Bacham is built with a modern, high-performance tech stack:
*   **Backend:** Rust (Tauri Core) + SQLite (sqlx) for blazing-fast local processing and safe file management.
*   **Frontend:** React 18 + Vite + TypeScript + TailwindCSS for a beautiful, responsive UI.
*   **AI Engine:** Integrates with Gemini, OpenAI, and local LLMs via modular trait-based Providers.

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please refer to the [CONTRIBUTING.md](./CONTRIBUTING.md) file for more detailed guidelines on how to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
