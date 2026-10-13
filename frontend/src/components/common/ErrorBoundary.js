
import React from "react";

/* ============================================================
   SYNCDOC — ERROR BOUNDARY
   Production-ready application error boundary
============================================================ */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /* ----------------------------------------------------------
     Catch render errors
  ---------------------------------------------------------- */

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  /* ----------------------------------------------------------
     Error reporting / logging
  ---------------------------------------------------------- */

  componentDidCatch(error, errorInfo) {
    this.setState({
      errorInfo,
    });

    /*
     * Development logging.
     *
     * Replace this later with Sentry,
     * LogRocket, or your own monitoring API.
     */
    if (import.meta?.env?.DEV) {
      console.error(
        "SyncDoc ErrorBoundary:",
        error
      );

      console.error(
        "Component stack:",
        errorInfo?.componentStack
      );
    }

    /*
     * Optional external error handler.
     *
     * Usage:
     *
     * <ErrorBoundary
     *   onError={(error, errorInfo) => {
     *     sendErrorToServer(error);
     *   }}
     * >
     */
    if (
      typeof this.props.onError ===
      "function"
    ) {
      try {
        this.props.onError(
          error,
          errorInfo
        );
      } catch (reportingError) {
        console.error(
          "Error reporting failed:",
          reportingError
        );
      }
    }
  }

  /* ----------------------------------------------------------
     Reset boundary
  ---------------------------------------------------------- */

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /* ----------------------------------------------------------
     Reload application
  ---------------------------------------------------------- */

  handleReload = () => {
    window.location.reload();
  };

  /* ----------------------------------------------------------
     Render fallback
  ---------------------------------------------------------- */

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const {
      error,
      errorInfo,
    } = this.state;

    const {
      fallback,
      showDetails = false,
      title = "Something went wrong",
      description,
    } = this.props;

    /*
     * Allow a completely custom fallback.
     */
    if (fallback) {
      if (
        typeof fallback ===
        "function"
      ) {
        return fallback({
          error,
          errorInfo,
          reset: this.handleReset,
          reload: this.handleReload,
        });
      }

      return fallback;
    }

    const errorMessage =
      error?.message ||
      "Unexpected application error.";

    return (
      <div
        className="error-screen"
        role="alert"
        aria-live="assertive"
      >
        <div className="error-card">
          {/* ------------------------------------------------
              Error icon
          ------------------------------------------------ */}

          <div
            className="error-icon"
            aria-hidden="true"
          >
            !
          </div>

          {/* ------------------------------------------------
              Heading
          ------------------------------------------------ */}

          <h1>{title}</h1>

          {/* ------------------------------------------------
              Description
          ------------------------------------------------ */}

          <p>
            {description ||
              "SyncDoc encountered an unexpected error. You can try again or reload the application."}
          </p>

          {/* ------------------------------------------------
              Error message
          ------------------------------------------------ */}

          {showDetails && (
            <div className="error-details">
              <strong>
                Error details
              </strong>

              <code>
                {errorMessage}
              </code>

              {errorInfo
                ?.componentStack && (
                  <details>
                    <summary>
                      Component stack
                    </summary>

                    <pre>
                      {
                        errorInfo.componentStack
                      }
                    </pre>
                  </details>
                )}
            </div>
          )}

          {/* ------------------------------------------------
              Actions
          ------------------------------------------------ */}

          <div className="error-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={this.handleReset}
            >
              Try again
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReload}
            >
              Reload application
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
