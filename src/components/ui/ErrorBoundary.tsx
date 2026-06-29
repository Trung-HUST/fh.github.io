import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--matrix-bg)] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-black border border-red-500/50 p-6 font-mono">
            <h1 className="text-xl text-red-500 font-bold mb-4">SYSTEM FAILURE: UNHANDLED EXCEPTION</h1>
            
            <div className="space-y-4">
              <div className="bg-red-950/20 p-4 border-l-2 border-red-500">
                <p className="text-red-400 font-bold">{this.state.error?.name}: {this.state.error?.message}</p>
              </div>
              
              <div className="bg-black/50 p-4 border border-matrix-ghost/20 overflow-auto max-h-96">
                <p className="text-matrix-dim text-xs whitespace-pre-wrap">
                  {this.state.error?.stack}
                </p>
                <div className="mt-4 pt-4 border-t border-matrix-ghost/20">
                  <p className="text-matrix-muted text-[10px] uppercase font-bold mb-2">Component Stack</p>
                  <p className="text-matrix-dim text-xs whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 transition-colors uppercase text-sm font-bold"
              >
                [ REBOOT SYSTEM ]
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
