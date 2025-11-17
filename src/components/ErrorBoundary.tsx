import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You could also log the error to an error reporting service here
    // e.g., logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
          <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
            <div className="card-body">
              {/* Error Icon */}
              <div className="flex justify-center mb-4">
                <div className="bg-error/10 p-6 rounded-full">
                  <AlertCircle className="w-16 h-16 text-error" />
                </div>
              </div>

              {/* Error Title */}
              <h2 className="card-title text-2xl justify-center mb-2">
                Oops! Something went wrong
              </h2>

              {/* Error Message */}
              <p className="text-center text-base-content/70 mb-4">
                The application encountered an unexpected error. This has been logged for debugging.
              </p>

              {/* Error Details (Collapsible) */}
              <div className="collapse collapse-arrow bg-base-200 mb-4">
                <input type="checkbox" />
                <div className="collapse-title font-medium">
                  Error Details (for developers)
                </div>
                <div className="collapse-content">
                  <div className="mockup-code text-xs">
                    <pre>
                      <code>
                        {this.state.error?.toString()}
                        {'\n\n'}
                        {this.state.errorInfo?.componentStack}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="card-actions justify-center gap-3">
                <button
                  onClick={this.handleReset}
                  className="btn btn-outline btn-primary"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>

                <button
                  onClick={this.handleReload}
                  className="btn btn-primary"
                >
                  Reload Application
                </button>
              </div>

              {/* Help Text */}
              <div className="alert alert-info mt-4">
                <AlertCircle className="w-5 h-5" />
                <div className="text-sm">
                  <p className="font-medium">Need help?</p>
                  <p>
                    If this error persists, please check the console logs or contact support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 * Usage: wrap your component with <ErrorBoundaryWrapper>
 */
export function ErrorBoundaryWrapper({ children, fallback }: ErrorBoundaryProps) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}
