import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import "./i18n/config";
import App from "./App";

import { ErrorBoundary } from "./components/ErrorBoundary";

// Set OS-specific class on document root for native titlebar safe areas
const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
document.documentElement.classList.add(isMac ? 'os-mac' : 'os-windows');

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
