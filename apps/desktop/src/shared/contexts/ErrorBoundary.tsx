import { Component, ErrorInfo, ReactNode } from "react";
import { TauriClient } from "@/infrastructure/tauri-client";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    TauriClient.writeLog("ERROR", "ErrorBoundary", `${error.message}\n${errorInfo.componentStack}`);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center text-[#F8F9FA] p-8" style={{ backgroundColor: '#0A0A0C' }}>
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <p className="text-muted-foreground mb-4">The application encountered an unexpected error.</p>
          <pre className="bg-muted p-4 rounded text-sm max-w-3xl overflow-auto border border-border">
            {this.state.error?.message}
          </pre>
          <button 
            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
