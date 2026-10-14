import "./pages-premium.css";
import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Users,
  History,
  CheckCircle2,
} from "lucide-react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_REDIRECT = "/dashboard";

const SAFE_REDIRECT_PREFIXES = [
  "/dashboard",
  "/documents",
  "/workspaces",
  "/settings",
  "/analytics",
  "/admin",
];

/* ============================================================
   HELPERS
============================================================ */

/**
 * Prevent open redirects.
 *
 * Only internal SyncDoc application routes are allowed.
 */
function isSafeRedirect(path) {
  if (!path || typeof path !== "string") {
    return false;
  }

  if (!path.startsWith("/")) {
    return false;
  }

  if (path.startsWith("//")) {
    return false;
  }

  /*
   * Do not allow /login or authentication routes
   * as post-login destinations.
   */
  if (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/register" ||
    path.startsWith("/register/")
  ) {
    return false;
  }

  return SAFE_REDIRECT_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`)
  );
}

/**
 * Resolve the route to return to after successful login.
 */
function getRedirectPath(location) {
  const from = location?.state?.from;

  if (typeof from === "string") {
    return isSafeRedirect(from)
      ? from
      : DEFAULT_REDIRECT;
  }

  if (from?.pathname) {
    const path =
      `${from.pathname || ""}` +
      `${from.search || ""}` +
      `${from.hash || ""}`;

    return isSafeRedirect(path)
      ? path
      : DEFAULT_REDIRECT;
  }

  return DEFAULT_REDIRECT;
}

/**
 * Basic email validation.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Extract the most useful API error message.
 */
function extractApiMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.response?.data?.errors?.[0] ||
    error?.message ||
    ""
  );
}

/**
 * Convert API/network errors into user-friendly messages.
 */
function getLoginErrorMessage(error) {
  const status = error?.response?.status;

  const apiMessage = extractApiMessage(error);

  if (status === 400) {
    return (
      apiMessage ||
      "Please check your email and password."
    );
  }

  if (status === 401) {
    return "Invalid email or password. Please try again.";
  }

  if (status === 403) {
    return (
      apiMessage ||
      "Your account does not currently have access."
    );
  }

  if (status === 404) {
    return (
      "Authentication service could not be reached. " +
      "Please try again later."
    );
  }

  if (status === 408) {
    return "The request timed out. Please try again.";
  }

  if (status === 409) {
    return (
      apiMessage ||
      "There is a problem with this account."
    );
  }

  if (status === 422) {
    return (
      apiMessage ||
      "Please check the information you entered."
    );
  }

  if (status >= 500) {
    return (
      "Something went wrong on the server. " +
      "Please try again."
    );
  }

  if (
    error?.code === "ERR_NETWORK" ||
    error?.message === "Network Error"
  ) {
    return (
      "Unable to connect to SyncDoc. " +
      "Please check your internet connection and try again."
    );
  }

  return (
    apiMessage ||
    "Unable to sign in. Please check your credentials and try again."
  );
}

/* ============================================================
   LOGIN PAGE
============================================================ */

export default function Login() {
  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  /* ==========================================================
     IDS / REFS
  ========================================================== */

  const emailId = useId();
  const passwordId = useId();

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const mountedRef = useRef(true);

  /* ==========================================================
     FORM STATE
  ========================================================== */

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    form: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  /* ==========================================================
     LIFECYCLE
  ========================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ==========================================================
     INPUT CHANGE
  ========================================================== */

  const handleChange = useCallback(
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setForm((previous) => ({
        ...previous,
        [name]: value,
      }));

      setErrors((previous) => ({
        ...previous,
        [name]: "",
        form: "",
      }));
    },
    []
  );

  /* ==========================================================
     FIELD BLUR VALIDATION
  ========================================================== */

  const handleBlur = useCallback(
    (event) => {
      const {
        name,
        value,
      } = event.target;

      if (name === "email") {
        const email = value.trim();

        if (!email) {
          setErrors((previous) => ({
            ...previous,
            email:
              "Email address is required.",
          }));

          return;
        }

        if (!isValidEmail(email)) {
          setErrors((previous) => ({
            ...previous,
            email:
              "Please enter a valid email address.",
          }));
        }
      }

      if (name === "password") {
        if (!value) {
          setErrors((previous) => ({
            ...previous,
            password:
              "Password is required.",
          }));

          return;
        }

        if (value.length < 6) {
          setErrors((previous) => ({
            ...previous,
            password:
              "Password must contain at least 6 characters.",
          }));
        }
      }
    },
    []
  );

  /* ==========================================================
     FORM VALIDATION
  ========================================================== */

  const validateForm = useCallback(() => {
    const email = form.email.trim();
    const password = form.password;

    const nextErrors = {
      email: "",
      password: "",
      form: "",
    };

    if (!email) {
      nextErrors.email =
        "Email address is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email =
        "Please enter a valid email address.";
    }

    if (!password) {
      nextErrors.password =
        "Password is required.";
    } else if (password.length < 6) {
      nextErrors.password =
        "Password must contain at least 6 characters.";
    }

    setErrors(nextErrors);

    if (nextErrors.email) {
      window.requestAnimationFrame(() => {
        emailInputRef.current?.focus();
      });
    } else if (nextErrors.password) {
      window.requestAnimationFrame(() => {
        passwordInputRef.current?.focus();
      });
    }

    return (
      !nextErrors.email &&
      !nextErrors.password
    );
  }, [
    form.email,
    form.password,
  ]);

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      if (!validateForm()) {
        return;
      }

      setLoading(true);

      setErrors({
        email: "",
        password: "",
        form: "",
      });

      try {
        await login({
          email: form.email
            .trim()
            .toLowerCase(),
          password: form.password,
        });

        if (!mountedRef.current) {
          return;
        }

        const redirectPath =
          getRedirectPath(location);

        navigate(redirectPath, {
          replace: true,
        });
      } catch (error) {
        console.error(
          "SyncDoc login failed:",
          error
        );

        if (!mountedRef.current) {
          return;
        }

        setErrors((previous) => ({
          ...previous,
          form:
            getLoginErrorMessage(error),
        }));
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [
      form.email,
      form.password,
      loading,
      validateForm,
      login,
      location,
      navigate,
    ]
  );

  /* ==========================================================
     PASSWORD TOGGLE
  ========================================================== */

  const handlePasswordToggle =
    useCallback(() => {
      setShowPassword(
        (previous) => !previous
      );

      window.requestAnimationFrame(() => {
        passwordInputRef.current?.focus();
      });
    }, []);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <AuthPage
      title="Welcome back"
      subtitle="Sign in to continue to your workspace."
    >
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* ====================================================
            FORM ERROR
        ==================================================== */}

        {errors.form && (
          <div
            className="form-error"
            role="alert"
            aria-live="assertive"
          >
            <span
              className="form-error-icon"
              aria-hidden="true"
            >
              !
            </span>

            <span className="form-error-message">
              {errors.form}
            </span>
          </div>
        )}

        {/* ====================================================
            EMAIL
        ==================================================== */}

        <div className="form-field">
          <label htmlFor={emailId}>
            Email address
          </label>

          <div
            className={[
              "input-wrapper",
              errors.email
                ? "input-wrapper-error"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className="input-icon"
              aria-hidden="true"
            >
              <Mail size={17} />
            </span>

            <input
              ref={emailInputRef}
              id={emailId}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="email"
              autoFocus
              required
              disabled={loading}
              aria-invalid={
                Boolean(errors.email)
              }
              aria-describedby={
                errors.email
                  ? `${emailId}-error`
                  : undefined
              }
            />
          </div>

          {errors.email && (
            <span
              id={`${emailId}-error`}
              className="field-error"
              role="alert"
            >
              {errors.email}
            </span>
          )}
        </div>

        {/* ====================================================
            PASSWORD
        ==================================================== */}

        <div className="form-field">
          <div className="form-label-row">
            <label htmlFor={passwordId}>
              Password
            </label>

            <Link
              to="/forgot-password"
              className="form-link"
              tabIndex={loading ? -1 : 0}
            >
              Forgot password?
            </Link>
          </div>

          <div
            className={[
              "input-wrapper",
              errors.password
                ? "input-wrapper-error"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className="input-icon"
              aria-hidden="true"
            >
              <Lock size={17} />
            </span>

            <input
              ref={passwordInputRef}
              id={passwordId}
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
              aria-invalid={
                Boolean(errors.password)
              }
              aria-describedby={
                errors.password
                  ? `${passwordId}-error`
                  : undefined
              }
            />

            <button
              type="button"
              className="password-toggle"
              onClick={
                handlePasswordToggle
              }
              disabled={loading}
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              title={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <>
                  <EyeOff
                    size={16}
                    aria-hidden="true"
                  />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <Eye
                    size={16}
                    aria-hidden="true"
                  />
                  <span>Show</span>
                </>
              )}
            </button>
          </div>

          {errors.password && (
            <span
              id={`${passwordId}-error`}
              className="field-error"
              role="alert"
            >
              {errors.password}
            </span>
          )}
        </div>

        {/* ====================================================
            SECURITY
        ==================================================== */}

        <div className="auth-security-row">
          <span className="security-indicator">
            <ShieldCheck
              size={15}
              aria-hidden="true"
            />

            <span>
              Secure sign in
            </span>
          </span>

          <span className="security-text">
            Protected connection
          </span>
        </div>

        {/* ====================================================
            SUBMIT
        ==================================================== */}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={loading}
          className="auth-submit"
        >
          {loading ? (
            <>
              <RefreshCw
                size={17}
                className="auth-submit-spinner"
                aria-hidden="true"
              />

              <span>
                Signing in...
              </span>
            </>
          ) : (
            <>
              <span>
                Sign in
              </span>

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </>
          )}
        </Button>

        {/* ====================================================
            REGISTER
        ==================================================== */}

        <p className="auth-switch">
          New to SyncDoc?{" "}
          <Link to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </AuthPage>
  );
}

/* ============================================================
   AUTH PAGE LAYOUT
============================================================ */

export function AuthPage({
  title,
  subtitle,
  children,
}) {
  return (
    <main
      className="auth-page"
      aria-labelledby="auth-title"
    >
      {/* ======================================================
          BRAND
      ====================================================== */}

      <header className="auth-brand">
        <Link
          to="/"
          className="auth-brand-link"
          aria-label="SyncDoc home"
        >
          <span
            className="brand-mark"
            aria-hidden="true"
          >
            S
          </span>

          <span className="brand-name">
            SyncDoc
          </span>
        </Link>
      </header>

      {/* ======================================================
          MAIN AUTH LAYOUT
      ====================================================== */}

      <section className="auth-layout">
        {/* ====================================================
            PROMOTIONAL PANEL
        ==================================================== */}

        <aside
          className="auth-promo"
          aria-label="SyncDoc features"
        >
          <div className="auth-promo-content">
            <span className="eyebrow">
              COLLABORATE BETTER
            </span>

            <h1>
              Your team's ideas,
              <br />
              <span>
                perfectly in sync.
              </span>
            </h1>

            <p>
              Write, organize, share and
              collaborate on documents from
              one focused workspace.
            </p>

            {/* ================================================
                FEATURES
            ================================================= */}

            <div className="auth-promo-features">
              <PromoFeature
                icon={
                  <Users size={19} />
                }
                title="Real-time collaboration"
                description="Everyone stays aligned as work changes."
              />

              <PromoFeature
                icon={
                  <History size={19} />
                }
                title="Version history"
                description="Keep every important iteration safe."
              />

              <PromoFeature
                icon={
                  <FileText size={19} />
                }
                title="Organized workspaces"
                description="Keep documents, people and projects together."
              />
            </div>

            {/* ================================================
                TRUST POINTS
            ================================================= */}

            <div className="auth-trust-list">
              <TrustPoint>
                Secure workspace
              </TrustPoint>

              <TrustPoint>
                Real-time editing
              </TrustPoint>

              <TrustPoint>
                Automatic saving
              </TrustPoint>
            </div>
          </div>

          {/* ==================================================
              PROMO FOOTER
          ================================================== */}

          <div className="auth-promo-footer">
            <span>
              Built for focused teams.
            </span>

            <span aria-hidden="true">
              •
            </span>

            <span>
              Secure by design.
            </span>
          </div>
        </aside>

        {/* ====================================================
            AUTH CARD
        ==================================================== */}

        <section
          className="auth-card"
          aria-labelledby="auth-title"
        >
          <div className="auth-card-header">
            <span className="eyebrow">
              SYNCDOC ACCOUNT
            </span>

            <h2 id="auth-title">
              {title}
            </h2>

            <p>
              {subtitle}
            </p>
          </div>

          {children}
        </section>
      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="auth-footer">
        <span>
          © {new Date().getFullYear()} SyncDoc
        </span>

        <span
          className="auth-footer-separator"
          aria-hidden="true"
        >
          •
        </span>

        <span>
          Your workspace, in sync.
        </span>
      </footer>
    </main>
  );
}

/* ============================================================
   PROMO FEATURE
============================================================ */

function PromoFeature({
  icon,
  title,
  description,
}) {
  return (
    <div className="promo-card">
      <span
        className="promo-card-icon"
        aria-hidden="true"
      >
        {icon}
      </span>

      <div className="promo-card-content">
        <strong>{title}</strong>

        <small>
          {description}
        </small>
      </div>
    </div>
  );
}

/* ============================================================
   TRUST POINT
============================================================ */

function TrustPoint({ children }) {
  return (
    <span className="auth-trust-point">
      <CheckCircle2
        size={15}
        aria-hidden="true"
      />

      <span>{children}</span>
    </span>
  );
}