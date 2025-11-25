import React from 'react';
import { logger } from '../utils/logger';

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * This prevents:
 * - Stack trace exposure in production
 * - White screen of death
 * - Information disclosure through error messages
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    logger.error('Error caught by Error Boundary:', {
      error: error.toString(),
      errorInfo: errorInfo.componentStack
    });

    // In production, send to monitoring service
    if (import.meta.env.PROD) {
      // Send to Sentry, LogRocket, or other monitoring service
      // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }

    // Store error details in state (only in development)
    if (import.meta.env.DEV) {
      this.setState({
        error,
        errorInfo
      });
    }
  }

  handleReload = () => {
    // Clear error state and reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Production: Clean error page without sensitive info
      if (import.meta.env.PROD) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Si è verificato un errore
                </h1>
                <p className="text-gray-600 mb-6">
                  Ci scusiamo per l'inconveniente. Il problema è stato registrato e
                  verrà risolto al più presto.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Torna alla Home
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Ricarica la Pagina
                </button>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Se il problema persiste, contatta{' '}
                <a href="/contatti" className="text-primary hover:underline">
                  il supporto
                </a>
              </p>
            </div>
          </div>
        );
      }

      // Development: Detailed error page with stack trace
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Development Error
              </h1>
              <p className="text-gray-600 mb-4">
                This detailed error is only visible in development mode.
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Error:</h2>
              <pre className="text-sm text-red-800 overflow-x-auto">
                {this.state.error && this.state.error.toString()}
              </pre>
            </div>

            {/* Component Stack */}
            {this.state.errorInfo && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Component Stack:
                </h2>
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
              >
                Go to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
