import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import "./i18n/config";
import App from "./App";

import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
