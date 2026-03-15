import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DefaultFallbackProps {
  error: Error | null;
}

function DefaultFallback({ error }: DefaultFallbackProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          An unexpected error occurred. The error has been logged.
        </p>
        {error && (
          <details className="mb-4 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors mb-1">
              Technical details
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-32 text-destructive">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload page
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}

interface InnerProps {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  locationKey: string;
}

interface InnerState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<InnerProps, InnerState> {
  state: InnerState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): InnerState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`[ErrorBoundary${this.props.context ? `:${this.props.context}` : ""}]`, error, info.componentStack);
    }
  }

  componentDidUpdate(prevProps: InnerProps) {
    if (prevProps.locationKey !== this.props.locationKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

export function ErrorBoundary({ children, fallback, context }: ErrorBoundaryProps) {
  const location = useLocation();
  return (
    <ErrorBoundaryInner locationKey={location.key} context={context} fallback={fallback}>
      {children}
    </ErrorBoundaryInner>
  );
}
