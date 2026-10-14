import "./pages-premium.css";
import "./auth-premium.css";

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
  Sparkles,
  KeyRound,
  CircleHelp,
} from "lucide-react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";

const DEFAULT_REDIRECT = "/dashboard";

const SAFE_REDIRECT_PREFIXES = [
  "/dashboard",
  "/documents",
  "/workspaces",
  "/settings",
  "/analytics",
  "/admin",
];

function isSafeRedirect(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  // Reject encoded or literal backslash paths, which can be interpreted differently by browsers/proxies.
  if (path.includes("\\") || /%5c/i.test(path)) return false;

  let pathname = path;
  try {
    pathname = new URL(path, window.location.origin).pathname;
  } catch {
    return false;
  }

  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/")
  ) {
    return false;
  }

  return SAFE_REDIRECT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getRedirectPath(location) {
  const from = location?.state?.from;

  if (typeof from === "string") {
    return isSafeRedirect(from) ? from : DEFAULT_REDIRECT;
  }

  if (from?.pathname) {
    const path = `${from.pathname || ""}${from.search || ""}${from.hash || ""}`;
    return isSafeRedirect(path) ? path : DEFAULT_REDIRECT;
  }

  return DEFAULT_REDIRECT;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractApiMessage(error) {
  const data = error?.response?.data;
  const firstError = data?.errors?.[0];

  return (
    data?.message ||
    data?.error ||
    (typeof firstError === "string" ? firstError : firstError?.message) ||
    error?.message ||
    ""
  );
}

function getLoginErrorMessage(error) {
  const status = error?.response?.status;
  const apiMessage = extractApiMessage(error);

  if (status === 400 || status === 422) {
    return apiMessage || "Check your email and password, then try again.";
  }
  if (status === 401) {
    return "The email or password you entered doesn't match our records.";
  }
  if (status === 403) {
    return apiMessage || "This account can't sign in right now. Contact your workspace administrator.";
  }
  if (status === 404) {
    return "The sign-in service couldn't be found. Please try again in a moment.";
  }
  if (status === 408 || error?.code === "ECONNABORTED") {
    return "That took too long. Check your connection and try again.";
  }
  if (status === 429) {
    return "Too many sign-in attempts. Please wait a moment before trying again.";
  }
  if (status >= 500) {
    return "SyncDoc is having trouble right now. Please try again shortly.";
  }
  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
    return "We couldn't connect to SyncDoc. Check your internet connection and try again.";
  }
  return apiMessage || "Unable to sign in. Please check your details and try again.";
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const emailId = useId();
  const passwordId = useId();

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const mountedRef = useRef(false);

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "", form: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    emailInputRef.current?.focus({ preventScroll: true });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "", form: "" }));
  }, []);

  const validateField = useCallback((name, value) => {
    if (name === "email") {
      const email = value.trim();
      if (!email) return "Email address is required.";
      if (!isValidEmail(email)) return "Enter a valid email address.";
    }

    if (name === "password") {
      if (!value) return "Password is required.";
      if (value.length < 6) return "Password must contain at least 6 characters.";
    }

    return "";
  }, []);

  const handleBlur = useCallback((event) => {
    const { name, value } = event.target;
    const message = validateField(name, value);
    setErrors((previous) => ({ ...previous, [name]: message }));
  }, [validateField]);

  const validateForm = useCallback(() => {
    const nextErrors = {
      email: validateField("email", form.email),
      password: validateField("password", form.password),
      form: "",
    };

    setErrors(nextErrors);

    if (nextErrors.email) {
      window.requestAnimationFrame(() => emailInputRef.current?.focus());
    } else if (nextErrors.password) {
      window.requestAnimationFrame(() => passwordInputRef.current?.focus());
    }

    return !nextErrors.email && !nextErrors.password;
  }, [form.email, form.password, validateField]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (loading || !validateForm()) return;

    setLoading(true);
    setErrors({ email: "", password: "", form: "" });

    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (!mountedRef.current) return;

      // Only the email is persisted; never store a password in browser storage.
      if (rememberEmail) {
        try {
          window.localStorage.setItem("syncdoc.rememberedEmail", form.email.trim().toLowerCase());
        } catch {
          // Storage may be disabled; sign-in should still succeed.
        }
      } else {
        try {
          window.localStorage.removeItem("syncdoc.rememberedEmail");
        } catch {
          // Ignore storage restrictions.
        }
      }

      navigate(getRedirectPath(location), { replace: true });
    } catch (error) {
      console.error("SyncDoc login failed:", error);
      if (mountedRef.current) {
        setErrors((previous) => ({ ...previous, form: getLoginErrorMessage(error) }));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [form.email, form.password, loading, validateForm, login, location, navigate, rememberEmail]);

  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem("syncdoc.rememberedEmail");
      if (remembered) {
        setForm((previous) => ({ ...previous, email: remembered }));
        setRememberEmail(true);
      }
    } catch {
      // Storage may be unavailable in private browsing or restricted environments.
    }
  }, []);

  const handlePasswordToggle = useCallback(() => {
    setShowPassword((previous) => !previous);
    window.requestAnimationFrame(() => passwordInputRef.current?.focus({ preventScroll: true }));
  }, []);

  return (
    <AuthPage
      title="Welcome back"
      subtitle="Sign in to pick up where your team left off."
    >
      <form className="auth-form auth-form-premium" onSubmit={handleSubmit} noValidate>
        {errors.form && (
          <div className="form-error auth-form-error-premium" role="alert" aria-live="assertive">
            <span className="form-error-icon" aria-hidden="true">!</span>
            <span className="form-error-message">{errors.form}</span>
          </div>
        )}

        <div className="form-field auth-field-premium">
          <label htmlFor={emailId}>Email address</label>
          <div className={`input-wrapper auth-input-premium ${errors.email ? "input-wrapper-error" : ""}`}>
            <span className="input-icon" aria-hidden="true"><Mail size={18} /></span>
            <input
              ref={emailInputRef}
              id={emailId}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@company.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="email"
              required
              disabled={loading}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${emailId}-error` : undefined}
            />
            {form.email && isValidEmail(form.email.trim()) && !errors.email && (
              <CheckCircle2 className="auth-input-valid" size={17} aria-label="Valid email format" />
            )}
          </div>
          {errors.email && <span id={`${emailId}-error`} className="field-error" role="alert">{errors.email}</span>}
        </div>

        <div className="form-field auth-field-premium">
          <div className="form-label-row">
            <label htmlFor={passwordId}>Password</label>
            <Link to="/forgot-password" className="form-link" tabIndex={loading ? -1 : 0}>
              Forgot password?
            </Link>
          </div>
          <div className={`input-wrapper auth-input-premium ${errors.password ? "input-wrapper-error" : ""}`}>
            <span className="input-icon" aria-hidden="true"><Lock size={18} /></span>
            <input
              ref={passwordInputRef}
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? `${passwordId}-error` : undefined}
            />
            <button
              type="button"
              className="password-toggle auth-password-toggle"
              onClick={handlePasswordToggle}
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              <span>{showPassword ? "Hide" : "Show"}</span>
            </button>
          </div>
          {errors.password && <span id={`${passwordId}-error`} className="field-error" role="alert">{errors.password}</span>}
        </div>

        <label className="auth-remember-row">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(event) => setRememberEmail(event.target.checked)}
            disabled={loading}
          />
          <span className="auth-custom-checkbox" aria-hidden="true"><CheckCircle2 size={13} /></span>
          <span>Remember my email on this device</span>
        </label>

        <div className="auth-security-row auth-security-premium">
          <span className="security-indicator">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Secure sign in</span>
          </span>
          <span className="security-text"><Lock size={13} aria-hidden="true" /> Your password stays private</span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={loading}
          className="auth-submit auth-submit-premium"
        >
          {loading ? (
            <>
              <RefreshCw size={17} className="auth-submit-spinner" aria-hidden="true" />
              <span>Signing you in…</span>
            </>
          ) : (
            <>
              <span>Sign in to SyncDoc</span>
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </Button>

        <div className="auth-form-divider"><span>YOUR WORKSPACE AWAITS</span></div>

        <p className="auth-switch">
          New to SyncDoc? <Link to="/register">Create an account <ArrowRight size={14} aria-hidden="true" /></Link>
        </p>

        <p className="auth-help-note">
          <CircleHelp size={14} aria-hidden="true" />
          Having trouble? <Link to="/forgot-password">Recover your account</Link>
        </p>
      </form>
    </AuthPage>
  );
}

export function AuthPage({ title, subtitle, children }) {
  return (
    <main className="auth-page auth-page-premium" aria-labelledby="auth-title">
      <div className="auth-background-orb auth-background-orb-one" aria-hidden="true" />
      <div className="auth-background-orb auth-background-orb-two" aria-hidden="true" />

      <header className="auth-brand auth-brand-premium">
        <Link to="/" className="auth-brand-link" aria-label="SyncDoc home">
          <span className="brand-mark" aria-hidden="true"><span>S</span></span>
          <span className="brand-name">SyncDoc<span className="brand-period">.</span></span>
        </Link>
        <span className="auth-brand-caption"><Sparkles size={14} aria-hidden="true" /> Workspace, reimagined</span>
      </header>

      <section className="auth-layout auth-layout-premium">
        <aside className="auth-promo auth-promo-premium" aria-label="SyncDoc features">
          <div className="auth-promo-grid" aria-hidden="true" />
          <div className="auth-promo-content">
            <span className="eyebrow auth-eyebrow-premium"><span className="eyebrow-dot" /> COLLABORATION, MADE SIMPLE</span>
            <h1>Your team's ideas,<br /><span>perfectly in sync.</span></h1>
            <p className="auth-promo-lead">A calmer, smarter place to create great work together. Every idea, update, and teammate in one beautifully organized workspace.</p>

            <div className="auth-preview-card" aria-label="Workspace preview">
              <div className="auth-preview-topbar">
                <div className="auth-preview-dots"><i /><i /><i /></div>
                <span><Lock size={11} aria-hidden="true" /> Private workspace</span>
              </div>
              <div className="auth-preview-document">
                <div className="auth-preview-doc-icon"><FileText size={19} aria-hidden="true" /></div>
                <div className="auth-preview-doc-copy"><strong>Product strategy</strong><span>Updated just now · Shared with team</span></div>
                <div className="auth-preview-avatars" aria-label="Three collaborators"><span>J</span><span>M</span><span>A</span><b>+2</b></div>
              </div>
              <div className="auth-preview-lines"><i /><i /><i /></div>
              <div className="auth-preview-footer"><span><span className="auth-live-dot" /> Live collaboration</span><span><CheckCircle2 size={13} /> All changes saved</span></div>
            </div>

            <div className="auth-promo-features">
              <PromoFeature icon={<Users size={19} />} title="Real-time collaboration" description="Make progress together, wherever you are." />
              <PromoFeature icon={<History size={19} />} title="Version history" description="Revisit changes and keep important work safe." />
              <PromoFeature icon={<FileText size={19} />} title="Organized workspaces" description="Everything your team needs, in one place." />
            </div>

            <div className="auth-trust-list">
              <TrustPoint>Secure workspace</TrustPoint>
              <TrustPoint>Automatic saving</TrustPoint>
              <TrustPoint>Team-ready by design</TrustPoint>
            </div>
          </div>

          <div className="auth-promo-footer"><span>Built for focused teams.</span><span className="auth-footer-bullet">•</span><span>Designed for momentum.</span></div>
        </aside>

        <section className="auth-card auth-card-premium" aria-labelledby="auth-title">
          <div className="auth-card-topline"><span className="auth-card-icon"><KeyRound size={19} aria-hidden="true" /></span><span className="auth-card-secure"><ShieldCheck size={14} aria-hidden="true" /> Secure access</span></div>
          <div className="auth-card-header auth-card-header-premium">
            <span className="eyebrow">WELCOME TO SYNCDOC</span>
            <h2 id="auth-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
          <div className="auth-card-bottom"><Lock size={13} aria-hidden="true" /><span>Your workspace is waiting right where you left it.</span></div>
        </section>
      </section>

      <footer className="auth-footer auth-footer-premium">
        <span>© {new Date().getFullYear()} SyncDoc</span><span className="auth-footer-separator">•</span><span>Your workspace, in sync.</span>
        <span className="auth-footer-right"><ShieldCheck size={13} aria-hidden="true" /> Privacy-minded by design</span>
      </footer>
    </main>
  );
}

function PromoFeature({ icon, title, description }) {
  return (
    <div className="promo-card auth-promo-feature-premium">
      <span className="promo-card-icon" aria-hidden="true">{icon}</span>
      <div className="promo-card-content"><strong>{title}</strong><small>{description}</small></div>
      <ArrowRight className="auth-feature-arrow" size={15} aria-hidden="true" />
    </div>
  );
}

function TrustPoint({ children }) {
  return <span className="auth-trust-point"><CheckCircle2 size={15} aria-hidden="true" /><span>{children}</span></span>;
}
