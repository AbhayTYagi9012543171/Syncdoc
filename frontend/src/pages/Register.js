
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import { AuthPage } from "./Login";

/* ============================================================
   CONSTANTS
============================================================ */

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely extract a readable API error.
 */
function getErrorMessage(error) {
  const status = error?.response?.status;

  const responseData = error?.response?.data;

  const message =
    responseData?.message ||
    responseData?.error ||
    responseData?.errors?.[0]?.message ||
    error?.message;

  if (status === 400) {
    return (
      message ||
      "Please check the information you entered."
    );
  }

  if (status === 409) {
    return (
      message ||
      "An account with this email already exists."
    );
  }

  if (status === 422) {
    return (
      message ||
      "Some of the provided information is invalid."
    );
  }

  if (status === 429) {
    return (
      "Too many registration attempts. " +
      "Please wait a moment and try again."
    );
  }

  if (status >= 500) {
    return (
      "Something went wrong on the server. " +
      "Please try again shortly."
    );
  }

  if (
    !navigator.onLine ||
    error?.code === "ERR_NETWORK"
  ) {
    return (
      "Unable to connect to SyncDoc. " +
      "Please check your internet connection."
    );
  }

  return (
    message ||
    "Unable to create your account. Please try again."
  );
}

/**
 * Validate email.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

/**
 * Get password requirements.
 */
function getPasswordRequirements(password) {
  return {
    length:
      password.length >= MIN_PASSWORD_LENGTH,

    lowercase:
      /[a-z]/.test(password),

    uppercase:
      /[A-Z]/.test(password),

    number:
      /[0-9]/.test(password),

    symbol:
      /[^A-Za-z0-9]/.test(password),
  };
}

/**
 * Calculate password strength.
 */
function getPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: "",
    };
  }

  const requirements =
    getPasswordRequirements(password);

  let score = 0;

  if (requirements.length) {
    score += 1;
  }

  if (
    password.length >= 12
  ) {
    score += 1;
  }

  if (requirements.lowercase) {
    score += 1;
  }

  if (requirements.uppercase) {
    score += 1;
  }

  if (requirements.number) {
    score += 1;
  }

  if (requirements.symbol) {
    score += 1;
  }

  if (score <= 2) {
    return {
      score,
      label: "Weak",
    };
  }

  if (score <= 4) {
    return {
      score,
      label: "Medium",
    };
  }

  return {
    score,
    label: "Strong",
  };
}

/**
 * Validate registration form.
 */
function validateForm(form) {
  const errors = {};

  const name =
    form.name.trim();

  const email =
    form.email.trim().toLowerCase();

  const password =
    form.password;

  const confirmPassword =
    form.confirmPassword;

  /* ----------------------------------------------------------
     NAME
  ---------------------------------------------------------- */

  if (!name) {
    errors.name =
      "Please enter your full name.";
  } else if (name.length < 2) {
    errors.name =
      "Your name must contain at least 2 characters.";
  } else if (
    name.length > MAX_NAME_LENGTH
  ) {
    errors.name =
      `Your name cannot exceed ${MAX_NAME_LENGTH} characters.`;
  }

  /* ----------------------------------------------------------
     EMAIL
  ---------------------------------------------------------- */

  if (!email) {
    errors.email =
      "Please enter your email address.";
  } else if (
    email.length > MAX_EMAIL_LENGTH
  ) {
    errors.email =
      "Your email address is too long.";
  } else if (
    !isValidEmail(email)
  ) {
    errors.email =
      "Please enter a valid email address.";
  }

  /* ----------------------------------------------------------
     PASSWORD
  ---------------------------------------------------------- */

  const requirements =
    getPasswordRequirements(password);

  if (!password) {
    errors.password =
      "Please create a password.";
  } else if (
    !requirements.length
  ) {
    errors.password =
      "Password must contain at least 8 characters.";
  }

  /* ----------------------------------------------------------
     CONFIRM PASSWORD
  ---------------------------------------------------------- */

  if (!confirmPassword) {
    errors.confirmPassword =
      "Please confirm your password.";
  } else if (
    password !== confirmPassword
  ) {
    errors.confirmPassword =
      "Passwords do not match.";
  }

  return errors;
}

/* ============================================================
   REGISTER PAGE
============================================================ */

export default function Register() {
  const {
    register,
  } = useAuth();

  const navigate =
    useNavigate();

  /* ==========================================================
     ACCESSIBILITY IDS
  ========================================================== */

  const nameId =
    useId();

  const emailId =
    useId();

  const passwordId =
    useId();

  const confirmPasswordId =
    useId();

  const generalErrorId =
    useId();

  /* ==========================================================
     FORM STATE
  ========================================================== */

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [generalError, setGeneralError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  /* ==========================================================
     PASSWORD ANALYSIS
  ========================================================== */

  const passwordRequirements =
    useMemo(
      () =>
        getPasswordRequirements(
          form.password
        ),
      [form.password]
    );

  const passwordStrength =
    useMemo(
      () =>
        getPasswordStrength(
          form.password
        ),
      [form.password]
    );

  const passwordsMatch =
    Boolean(
      form.confirmPassword &&
      form.password ===
      form.confirmPassword
    );

  /* ==========================================================
     FORM VALID
  ========================================================== */

  const isFormReady =
    Boolean(
      form.name.trim() &&
      form.email.trim() &&
      form.password &&
      form.confirmPassword
    );

  /* ==========================================================
     INPUT CHANGE
  ========================================================== */

  const handleChange =
    useCallback((event) => {
      const {
        name,
        value,
      } = event.target;

      setForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );

      /*
       * Clear general API error
       * as soon as the user edits
       * the form again.
       */
      setGeneralError("");

      setSuccess(false);

      /*
       * Remove the field-specific
       * validation error.
       */
      setFieldErrors(
        (previous) => {
          if (
            !previous[name]
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next[name];

          return next;
        }
      );

      /*
       * If password changes,
       * immediately clear stale
       * confirm-password error.
       */
      if (
        name === "password" &&
        form.confirmPassword
      ) {
        setFieldErrors(
          (previous) => {
            if (
              !previous.confirmPassword
            ) {
              return previous;
            }

            const next = {
              ...previous,
            };

            delete next.confirmPassword;

            return next;
          }
        );
      }
    }, [form.confirmPassword]);

  /* ==========================================================
     BLUR VALIDATION
  ========================================================== */

  const handleBlur =
    useCallback((event) => {
      const {
        name,
        value,
      } = event.target;

      const trimmedValue =
        value.trim();

      let message = "";

      if (
        name === "name"
      ) {
        if (!trimmedValue) {
          message =
            "Please enter your full name.";
        } else if (
          trimmedValue.length < 2
        ) {
          message =
            "Your name must contain at least 2 characters.";
        } else if (
          trimmedValue.length >
          MAX_NAME_LENGTH
        ) {
          message =
            `Your name cannot exceed ${MAX_NAME_LENGTH} characters.`;
        }
      }

      if (
        name === "email"
      ) {
        if (!trimmedValue) {
          message =
            "Please enter your email address.";
        } else if (
          !isValidEmail(
            trimmedValue
          )
        ) {
          message =
            "Please enter a valid email address.";
        }
      }

      if (
        name === "password"
      ) {
        if (!value) {
          message =
            "Please create a password.";
        } else if (
          value.length <
          MIN_PASSWORD_LENGTH
        ) {
          message =
            "Password must contain at least 8 characters.";
        }
      }

      if (
        name === "confirmPassword"
      ) {
        if (!value) {
          message =
            "Please confirm your password.";
        } else if (
          value !==
          form.password
        ) {
          message =
            "Passwords do not match.";
        }
      }

      setFieldErrors(
        (previous) => ({
          ...previous,
          [name]: message,
        })
      );
    }, [form.password]);

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const handleSubmit =
    useCallback(
      async (event) => {
        event.preventDefault();

        if (loading) {
          return;
        }

        setGeneralError("");
        setSuccess(false);

        const validationErrors =
          validateForm(form);

        if (
          Object.keys(
            validationErrors
          ).length > 0
        ) {
          setFieldErrors(
            validationErrors
          );

          /*
           * Move focus to the first
           * invalid field.
           */
          const firstInvalidField =
            Object.keys(
              validationErrors
            )[0];

          window.setTimeout(
            () => {
              const element =
                document.getElementById(
                  `register-${firstInvalidField}`
                );

              element?.focus();
            },
            0
          );

          return;
        }

        setLoading(true);

        try {
          const payload = {
            name:
              form.name.trim(),

            email:
              form.email
                .trim()
                .toLowerCase(),

            password:
              form.password,
          };

          await register(
            payload
          );

          setSuccess(true);

          /*
           * Give the user a short
           * success state before
           * moving to login.
           */
          window.setTimeout(
            () => {
              navigate(
                "/login",
                {
                  replace: true,
                  state: {
                    registered:
                      true,
                    email:
                      payload.email,
                  },
                }
              );
            },
            700
          );
        } catch (error) {
          console.error(
            "SyncDoc registration failed:",
            error
          );

          setGeneralError(
            getErrorMessage(
              error
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [
        form,
        loading,
        navigate,
        register,
      ]
    );

  /* ==========================================================
     CLEANUP / RESET SUCCESS TIMER
  ========================================================== */

  useEffect(() => {
    return () => {
      /*
       * React will discard pending
       * UI updates when unmounted.
       */
    };
  }, []);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <AuthPage
      title="Create your account"
      subtitle="Start your collaborative workspace in minutes."
    >
      <form
        className="auth-form register-form"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={loading}
      >
        {/* ====================================================
            GENERAL ERROR
        ==================================================== */}

        {generalError && (
          <div
            id={generalErrorId}
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

            <span>
              {generalError}
            </span>
          </div>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}

        {success && (
          <div
            className="form-success"
            role="status"
            aria-live="polite"
          >
            <span
              className="form-success-icon"
              aria-hidden="true"
            >
              ✓
            </span>

            <span>
              Account created successfully.
              Redirecting to sign in...
            </span>
          </div>
        )}

        {/* ====================================================
            FULL NAME
        ==================================================== */}

        <div
          className={
            fieldErrors.name
              ? "form-field field-invalid"
              : "form-field"
          }
        >
          <label htmlFor={`register-name`}>
            <span>
              Full name
            </span>
          </label>

          <input
            id="register-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Your name"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={
              MAX_NAME_LENGTH
            }
            autoFocus
            required
            disabled={
              loading || success
            }
            aria-invalid={
              Boolean(
                fieldErrors.name
              )
            }
            aria-describedby={
              fieldErrors.name
                ? `${nameId}-error`
                : undefined
            }
          />

          {fieldErrors.name && (
            <small
              id={`${nameId}-error`}
              className="field-error"
              role="alert"
            >
              {fieldErrors.name}
            </small>
          )}
        </div>

        {/* ====================================================
            EMAIL
        ==================================================== */}

        <div
          className={
            fieldErrors.email
              ? "form-field field-invalid"
              : "form-field"
          }
        >
          <label htmlFor="register-email">
            <span>
              Email address
            </span>
          </label>

          <input
            id="register-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            maxLength={
              MAX_EMAIL_LENGTH
            }
            spellCheck={false}
            required
            disabled={
              loading || success
            }
            aria-invalid={
              Boolean(
                fieldErrors.email
              )
            }
            aria-describedby={
              fieldErrors.email
                ? `${emailId}-error`
                : undefined
            }
          />

          {fieldErrors.email && (
            <small
              id={`${emailId}-error`}
              className="field-error"
              role="alert"
            >
              {fieldErrors.email}
            </small>
          )}
        </div>

        {/* ====================================================
            PASSWORD
        ==================================================== */}

        <div
          className={
            fieldErrors.password
              ? "form-field field-invalid"
              : "form-field"
          }
        >
          <label htmlFor="register-password">
            <span>
              Password
            </span>
          </label>

          <div className="password-field">
            <input
              id="register-password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={
                form.password
              }
              onChange={
                handleChange
              }
              onBlur={
                handleBlur
              }
              placeholder="Create a secure password"
              autoComplete="new-password"
              minLength={
                MIN_PASSWORD_LENGTH
              }
              required
              disabled={
                loading || success
              }
              aria-invalid={
                Boolean(
                  fieldErrors.password
                )
              }
              aria-describedby={`${passwordId}-help`}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(
                  (previous) =>
                    !previous
                )
              }
              disabled={
                loading || success
              }
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
              {showPassword
                ? "Hide"
                : "Show"}
            </button>
          </div>

          {/* ==================================================
              PASSWORD STRENGTH
          ================================================== */}

          {form.password && (
            <div
              className="password-strength"
              aria-live="polite"
            >
              <div className="password-strength-header">
                <span>
                  Password strength
                </span>

                <strong
                  className={`password-strength-${passwordStrength.label.toLowerCase()}`}
                >
                  {
                    passwordStrength.label
                  }
                </strong>
              </div>

              <div
                className="password-strength-bars"
                aria-hidden="true"
              >
                {[
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                ].map(
                  (level) => (
                    <span
                      key={level}
                      className={
                        level <=
                          passwordStrength.score
                          ? "active"
                          : ""
                      }
                    />
                  )
                )}
              </div>

              {/* ==================================================
                  REQUIREMENTS
              ================================================== */}

              <div
                className="password-requirements"
                aria-label="Password requirements"
              >
                <PasswordRequirement
                  valid={
                    passwordRequirements.length
                  }
                >
                  At least 8 characters
                </PasswordRequirement>

                <PasswordRequirement
                  valid={
                    passwordRequirements.lowercase
                  }
                >
                  One lowercase letter
                </PasswordRequirement>

                <PasswordRequirement
                  valid={
                    passwordRequirements.uppercase
                  }
                >
                  One uppercase letter
                </PasswordRequirement>

                <PasswordRequirement
                  valid={
                    passwordRequirements.number
                  }
                >
                  One number
                </PasswordRequirement>

                <PasswordRequirement
                  valid={
                    passwordRequirements.symbol
                  }
                >
                  One special character
                </PasswordRequirement>
              </div>
            </div>
          )}

          {!fieldErrors.password && (
            <small
              id={`${passwordId}-help`}
              className="field-help"
            >
              Use 8+ characters with letters,
              numbers and symbols.
            </small>
          )}

          {fieldErrors.password && (
            <small
              className="field-error"
              role="alert"
            >
              {fieldErrors.password}
            </small>
          )}
        </div>

        {/* ====================================================
            CONFIRM PASSWORD
        ==================================================== */}

        <div
          className={
            fieldErrors.confirmPassword
              ? "form-field field-invalid"
              : "form-field"
          }
        >
          <label htmlFor="register-confirm-password">
            <span>
              Confirm password
            </span>
          </label>

          <div className="password-field">
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={
                form.confirmPassword
              }
              onChange={
                handleChange
              }
              onBlur={
                handleBlur
              }
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
              disabled={
                loading || success
              }
              aria-invalid={
                Boolean(
                  fieldErrors.confirmPassword
                )
              }
              aria-describedby={
                fieldErrors.confirmPassword
                  ? `${confirmPasswordId}-error`
                  : undefined
              }
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowConfirmPassword(
                  (previous) =>
                    !previous
                )
              }
              disabled={
                loading || success
              }
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              title={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showConfirmPassword
                ? "Hide"
                : "Show"}
            </button>
          </div>

          {/* ==================================================
              PASSWORD MATCH
          ================================================== */}

          {passwordsMatch && (
            <small
              className="field-success"
              role="status"
            >
              ✓ Passwords match
            </small>
          )}

          {fieldErrors.confirmPassword && (
            <small
              id={`${confirmPasswordId}-error`}
              className="field-error"
              role="alert"
            >
              {
                fieldErrors.confirmPassword
              }
            </small>
          )}
        </div>

        {/* ====================================================
            SECURITY NOTICE
        ==================================================== */}

        <div className="auth-security-row">
          <span className="security-indicator">
            <span
              className="security-dot"
              aria-hidden="true"
            />

            Secure account creation
          </span>
        </div>

        {/* ====================================================
            TERMS
        ==================================================== */}

        <p className="auth-terms">
          By creating an account, you agree
          to use SyncDoc responsibly and keep
          your account credentials secure.
        </p>

        {/* ====================================================
            SUBMIT
        ==================================================== */}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={
            loading ||
            success ||
            !isFormReady
          }
          className="auth-submit"
        >
          {success
            ? "Account created"
            : loading
              ? "Creating account..."
              : "Create account"}
        </Button>

        {/* ====================================================
            LOGIN LINK
        ==================================================== */}

        <p className="auth-switch">
          Already have an account?{" "}
          <Link
            to="/login"
            tabIndex={
              loading ? -1 : 0
            }
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthPage>
  );
}

/* ============================================================
   PASSWORD REQUIREMENT
============================================================ */

function PasswordRequirement({
  valid,
  children,
}) {
  return (
    <span
      className={
        valid
          ? "password-requirement is-valid"
          : "password-requirement"
      }
    >
      <span
        className="password-requirement-icon"
        aria-hidden="true"
      >
        {valid ? "✓" : "○"}
      </span>

      <span>
        {children}
      </span>
    </span>
  );
}

