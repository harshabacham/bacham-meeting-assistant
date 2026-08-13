# Workspace Agent Guidelines

The following rules have been adopted to improve the AI's output, inspired by industry-leading agentic tools (Context7, Sentry AI, and Datadog AI):

## Context7 Protocol (Latest Documentation)
- **Rule:** Before implementing any new architecture or complex UI components using React, TailwindCSS, Next.js, or Tauri, you MUST prioritize searching the web for the most recent official documentation and best practices.
- **Why:** This prevents hallucinating deprecated APIs and ensures the codebase utilizes the most modern, performant standards available.

## Sentry/Datadog Protocol (Autonomous Debugging)
- **Rule:** When running terminal commands (`cargo build`, `npm run dev`, etc.) and encountering stack traces or errors, you must act as an autonomous Sentry agent. Do not panic or immediately ask the user for help. Deeply analyze the stack trace, search the codebase for the root cause, propose an AI-generated fix, and verify it locally.
- **Why:** This ensures maximum reliability and minimizes downtime during development.

## Composio Protocol (API Readiness)
- **Rule:** When building features that interact with external services, always structure the backend architecture to be modular and easily pluggable (like a Composio tool), ensuring clean separation between external API calls and core application logic.
