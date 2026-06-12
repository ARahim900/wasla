import React from 'react';

/**
 * Global error boundary: without it, any render exception leaves the user
 * (often a field inspector mid-walkthrough) staring at a blank white screen
 * with no way forward. Saved data is never affected — autosaved work lives
 * in the database — so a reload is always a safe recovery.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-background">
        <div className="text-center max-w-md">
          <p className="text-foreground font-medium mb-2">Something went wrong</p>
          <p className="text-muted-foreground text-base md:text-sm mb-4">
            An unexpected error occurred. Your saved data is safe — reload to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
