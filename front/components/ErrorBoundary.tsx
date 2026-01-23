'use client';

import React from 'react';
import { logComponentError } from '@/lib/errorLogger';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
  module?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName, module, onError } = this.props;

    // Guardar info del error
    this.setState({ errorInfo });

    // Loguear el error en MongoDB
    logComponentError(error, componentName || 'UnknownComponent', {
      module,
      componentStack: errorInfo.componentStack,
      action: 'component-crash'
    });

    // Callback opcional
    if (onError) {
      onError(error, errorInfo);
    }

    // Log en consola para desarrollo
    console.error('Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback personalizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
            Algo salió mal
          </h2>
          <p className="text-red-600 dark:text-red-300 text-center mb-4 max-w-md">
            Ha ocurrido un error inesperado. El equipo técnico ha sido notificado.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded text-sm max-w-full overflow-auto">
              <summary className="cursor-pointer font-medium text-red-700 dark:text-red-400">
                Detalles del error (desarrollo)
              </summary>
              <pre className="mt-2 text-red-600 dark:text-red-300 whitespace-pre-wrap">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Intentar de nuevo
            </Button>
            <Button
              onClick={this.handleReload}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// HOC para envolver componentes con Error Boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  module?: string
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary componentName={componentName} module={module}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
