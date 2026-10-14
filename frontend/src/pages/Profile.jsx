import "./pages-premium.css";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import Avatar from "../components/common/Avatar";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { useAuth } from "../context/AuthContext";

/* ============================================================
   SYNCDOC — PROFILE PAGE
   High-level production-ready profile management
============================================================ */

/* ============================================================
   CONSTANTS
============================================================ */

const MAX_BIO_LENGTH = 500;
const MAX_NAME_LENGTH = 80;

const DEFAULT_FORM = {
  name: "",
  email: "",
  bio: "",
};

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely get the user's display name.
 */
function getUserName(user) {
  if (!user || typeof user !== "object") {
    return "User";
  }

  return (
    user.name ||
    user.displayName ||
    user.username ||
    user.fullName ||
    "User"
  );
}

/**
 * Safely get the user's email.
 */
function getUserEmail(user) {
  if (!user || typeof user !== "object") {
    return "";
  }

  return (
    user.email ||
    user.emailAddress ||
    ""
  );
}

/**
 * Normalize role into a readable label.
 */
function getUserRole(user) {
  if (!user || typeof user !== "object") {
    return "Member";
  }

  const role =
    user.role ||
    user.workspaceRole ||
    user.permissions?.role;

  if (!role) {
    return "Member";
  }

  const normalized = String(role)
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "Member";
  }

  return (
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1)
  );
}

/**
 * Get user's bio.
 */
function getUserBio(user) {
  if (!user || typeof user !== "object") {
    return "";
  }

  return String(
    user.bio ||
      user.about ||
      user.description ||
      ""
  );
}

/**
 * Get initials for fallback avatar.
 */
function getInitials(name = "User") {
  const normalized = String(name)
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) {
    return "U";
  }

  const parts = normalized
    .split(" ")
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

/**
 * Safely format account creation date.
 */
function formatJoinedDate(user) {
  const value =
    user?.createdAt ||
    user?.created_at ||
    user?.joinedAt ||
    user?.dateJoined;

  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

/**
 * Normalize form values.
 */
function normalizeForm(user) {
  return {
    name:
      user?.name ||
      user?.displayName ||
      user?.username ||
      user?.fullName ||
      "",

    email:
      user?.email ||
      user?.emailAddress ||
      "",

    bio:
      user?.bio ||
      user?.about ||
      user?.description ||
      "",
  };
}

/**
 * Compare two forms.
 */
function formsEqual(first, second) {
  return (
    first.name === second.name &&
    first.email === second.email &&
    first.bio === second.bio
  );
}

/**
 * Validate profile form.
 */
function validateProfileForm(form) {
  const errors = {
    name: "",
    bio: "",
  };

  const name = form.name.trim();
  const bio = form.bio.trim();

  if (!name) {
    errors.name =
      "Display name is required.";
  } else if (name.length < 2) {
    errors.name =
      "Display name must contain at least 2 characters.";
  } else if (
    name.length > MAX_NAME_LENGTH
  ) {
    errors.name =
      `Display name cannot exceed ${MAX_NAME_LENGTH} characters.`;
  }

  if (bio.length > MAX_BIO_LENGTH) {
    errors.bio =
      `Bio cannot exceed ${MAX_BIO_LENGTH} characters.`;
  }

  return errors;
}

/**
 * Calculate profile completion.
 */
function getProfileCompletion(
  user,
  form
) {
  const fields = [
    Boolean(
      form.name?.trim() ||
        getUserName(user) !== "User"
    ),
    Boolean(form.email?.trim()),
    Boolean(form.bio?.trim()),
    Boolean(user?.avatar),
  ];

  const completed =
    fields.filter(Boolean).length;

  return Math.round(
    (completed / fields.length) * 100
  );
}

/* ============================================================
   PROFILE
============================================================ */

export default function Profile() {
  const {
    user,
  } = useAuth();

  const navigate = useNavigate();

  /* ==========================================================
     DERIVED USER DATA
  ========================================================== */

  const userName = useMemo(
    () => getUserName(user),
    [user]
  );

  const userEmail = useMemo(
    () => getUserEmail(user),
    [user]
  );

  const userRole = useMemo(
    () => getUserRole(user),
    [user]
  );

  const userBio = useMemo(
    () => getUserBio(user),
    [user]
  );

  const initials = useMemo(
    () => getInitials(userName),
    [userName]
  );

  const joinedDate = useMemo(
    () => formatJoinedDate(user),
    [user]
  );

  /* ==========================================================
     FORM STATE
  ========================================================== */

  const [form, setForm] =
    useState(() =>
      normalizeForm(user)
    );

  const [initialForm, setInitialForm] =
    useState(() =>
      normalizeForm(user)
    );

  /* ==========================================================
     UI STATE
  ========================================================== */

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [errors, setErrors] =
    useState({
      name: "",
      bio: "",
      form: "",
    });

  /* ==========================================================
     SYNC USER → FORM
  ========================================================== */

  useEffect(() => {
    const nextForm =
      normalizeForm(user);

    setForm(nextForm);
    setInitialForm(nextForm);

    setSaved(false);

    setErrors({
      name: "",
      bio: "",
      form: "",
    });
  }, [user]);

  /* ==========================================================
     DERIVED FORM STATE
  ========================================================== */

  const isDirty = useMemo(
    () =>
      !formsEqual(
        form,
        initialForm
      ),
    [form, initialForm]
  );

  const bioLength =
    form.bio.length;

  const profileCompletion =
    useMemo(
      () =>
        getProfileCompletion(
          user,
          form
        ),
      [user, form]
    );

  const hasFieldErrors =
    Boolean(
      errors.name ||
        errors.bio
    );

  /* ==========================================================
     INPUT CHANGE
  ========================================================== */

  const handleChange =
    useCallback(
      (event) => {
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

        setSaved(false);

        setErrors(
          (previous) => ({
            ...previous,
            [name]: "",
            form: "",
          })
        );
      },
      []
    );

  /* ==========================================================
     FIELD BLUR
  ========================================================== */

  const handleBlur =
    useCallback(
      (event) => {
        const {
          name,
        } = event.target;

        const fieldErrors =
          validateProfileForm(
            form
          );

        if (
          name === "name"
        ) {
          setErrors(
            (previous) => ({
              ...previous,
              name:
                fieldErrors.name,
            })
          );
        }

        if (
          name === "bio"
        ) {
          setErrors(
            (previous) => ({
              ...previous,
              bio:
                fieldErrors.bio,
            })
          );
        }
      },
      [form]
    );

  /* ==========================================================
     RESET FORM
  ========================================================== */

  const handleReset =
    useCallback(() => {
      if (saving) {
        return;
      }

      setForm(initialForm);

      setErrors({
        name: "",
        bio: "",
        form: "",
      });

      setSaved(false);
    }, [
      initialForm,
      saving,
    ]);

  /* ==========================================================
     SAVE PROFILE
  ========================================================== */

  const handleSubmit =
    useCallback(
      async (event) => {
        event.preventDefault();

        if (saving) {
          return;
        }

        const fieldErrors =
          validateProfileForm(
            form
          );

        const hasErrors =
          Boolean(
            fieldErrors.name ||
              fieldErrors.bio
          );

        if (hasErrors) {
          setErrors({
            ...fieldErrors,
            form:
              "Please correct the highlighted fields.",
          });

          return;
        }

        if (!isDirty) {
          setSaved(true);
          return;
        }

        setSaving(true);
        setSaved(false);

        setErrors({
          name: "",
          bio: "",
          form: "",
        });

        try {
          /*
           * ====================================================
           * CONNECT YOUR REAL API HERE
           *
           * Example:
           *
           * await userService.updateProfile({
           *   name: form.name.trim(),
           *   bio: form.bio.trim(),
           * });
           *
           * ====================================================
           */

          /*
           * Temporary successful operation.
           *
           * Replace this with your actual
           * userService.updateProfile() call.
           */
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                500
              )
          );

          const updatedForm = {
            ...form,
            name:
              form.name.trim(),
            bio:
              form.bio.trim(),
          };

          setForm(updatedForm);
          setInitialForm(
            updatedForm
          );

          setSaved(true);
        } catch (error) {
          console.error(
            "SyncDoc: failed to update profile:",
            error
          );

          setErrors({
            name: "",
            bio: "",
            form:
              error?.response
                ?.data?.message ||
              error?.message ||
              "Unable to update your profile. Please try again.",
          });
        } finally {
          setSaving(false);
        }
      },
      [
        form,
        saving,
        isDirty,
      ]
    );

  /* ==========================================================
     AVATAR HANDLER
  ========================================================== */

  const handleAvatarAction =
    useCallback(() => {
      /*
       * Avatar upload can be connected here.
       *
       * Example:
       * setAvatarModalOpen(true);
       *
       * Or navigate to a dedicated
       * avatar management screen.
       */
      console.info(
        "Avatar management is ready to be connected."
      );
    }, []);

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const handleSettings =
    useCallback(() => {
      navigate(
        "/settings"
      );
    }, [navigate]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className="page profile-page"
      aria-labelledby="profile-title"
    >
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <header className="page-heading profile-page-heading">
        <div className="page-heading-content">
          <span className="eyebrow">
            ACCOUNT
          </span>

          <h1 id="profile-title">
            My profile
          </h1>

          <p>
            Manage your personal information,
            identity and workspace profile.
          </p>
        </div>

        <div className="profile-header-actions">
          {isDirty && (
            <span
              className="profile-unsaved-indicator"
              role="status"
              aria-live="polite"
            >
              Unsaved changes
            </span>
          )}

          <Button
            variant="secondary"
            onClick={
              handleSettings
            }
          >
            Settings
          </Button>
        </div>
      </header>

      {/* ======================================================
          PROFILE HERO
      ====================================================== */}

      <Card
        className="profile-hero-card"
      >
        <div className="profile-hero">
          {/* ==================================================
              AVATAR
          ================================================== */}

          <div className="profile-avatar-section">
            <div
              className="profile-avatar-large"
              aria-label={`${userName} profile avatar`}
            >
              <Avatar
                user={user}
                name={userName}
                size="xl"
                status="online"
              />

              {!user?.avatar && (
                <span
                  className="profile-initials"
                  aria-hidden="true"
                >
                  {initials}
                </span>
              )}
            </div>

            <button
              type="button"
              className="profile-avatar-action"
              onClick={
                handleAvatarAction
              }
            >
              Change photo
            </button>
          </div>

          {/* ==================================================
              USER INFORMATION
          ================================================== */}

          <div className="profile-hero-info">
            <div className="profile-name-row">
              <h2>
                {userName}
              </h2>

              <span className="profile-role-badge">
                {userRole}
              </span>
            </div>

            <p className="profile-email">
              {userEmail ||
                "Email not available"}
            </p>

            <p className="profile-member">
              SyncDoc workspace member
              <span
                className="profile-meta-dot"
                aria-hidden="true"
              >
                •
              </span>
              Joined {joinedDate}
            </p>

            {userBio && (
              <p className="profile-hero-bio">
                {userBio}
              </p>
            )}
          </div>

          {/* ==================================================
              COMPLETION
          ================================================== */}

          <div
            className="profile-completion"
            aria-label={`Profile ${profileCompletion}% complete`}
          >
            <div className="profile-completion-header">
              <span>
                Profile completion
              </span>

              <strong>
                {profileCompletion}%
              </strong>
            </div>

            <div
              className="profile-completion-track"
              aria-hidden="true"
            >
              <span
                className="profile-completion-progress"
                style={{
                  width: `${profileCompletion}%`,
                }}
              />
            </div>

            <small>
              Complete your profile to help
              teammates recognize you.
            </small>
          </div>
        </div>
      </Card>

      {/* ======================================================
          MAIN GRID
      ====================================================== */}

      <div className="profile-grid">
        {/* ====================================================
            PERSONAL INFORMATION
        ==================================================== */}

        <Card
          title="Personal information"
          className="profile-form-card"
        >
          <form
            className="profile-form"
            onSubmit={
              handleSubmit
            }
            noValidate
          >
            {/* ================================================
                FORM ERROR
            ================================================= */}

            {errors.form && (
              <div
                className="profile-form-alert"
                role="alert"
                aria-live="assertive"
              >
                <span
                  className="profile-form-alert-icon"
                  aria-hidden="true"
                >
                  !
                </span>

                <span>
                  {errors.form}
                </span>
              </div>
            )}

            {/* ================================================
                NAME + EMAIL
            ================================================= */}

            <div className="form-grid">
              {/* ==============================================
                  NAME
              =============================================== */}

              <div className="form-field">
                <label htmlFor="profile-name">
                  <span>
                    Display name
                  </span>

                  <span
                    className="form-required"
                    aria-hidden="true"
                  >
                    *
                  </span>
                </label>

                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={
                    handleChange
                  }
                  onBlur={
                    handleBlur
                  }
                  placeholder="Your name"
                  autoComplete="name"
                  maxLength={
                    MAX_NAME_LENGTH
                  }
                  required
                  disabled={saving}
                  aria-invalid={Boolean(
                    errors.name
                  )}
                  aria-describedby={
                    errors.name
                      ? "profile-name-error"
                      : "profile-name-help"
                  }
                />

                {errors.name ? (
                  <small
                    id="profile-name-error"
                    className="field-error"
                    role="alert"
                  >
                    {errors.name}
                  </small>
                ) : (
                  <small
                    id="profile-name-help"
                    className="field-help"
                  >
                    This name will be visible to
                    your workspace members.
                  </small>
                )}
              </div>

              {/* ==============================================
                  EMAIL
              =============================================== */}

              <div className="form-field">
                <label htmlFor="profile-email">
                  <span>
                    Email address
                  </span>
                </label>

                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={form.email}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled
                  readOnly
                  aria-describedby="profile-email-help"
                />

                <small
                  id="profile-email-help"
                  className="field-help"
                >
                  Email changes may require
                  account verification.
                </small>
              </div>
            </div>

            {/* ================================================
                BIO
            ================================================= */}

            <div className="form-field">
              <div className="form-label-row">
                <label htmlFor="profile-bio">
                  <span>
                    About you
                  </span>
                </label>

                <span
                  className={
                    bioLength >
                    MAX_BIO_LENGTH
                      ? "character-count is-over-limit"
                      : "character-count"
                  }
                  aria-live="polite"
                >
                  {bioLength}/
                  {MAX_BIO_LENGTH}
                </span>
              </div>

              <textarea
                id="profile-bio"
                name="bio"
                value={form.bio}
                onChange={
                  handleChange
                }
                onBlur={
                  handleBlur
                }
                placeholder="Tell your team a little about yourself..."
                rows={6}
                maxLength={
                  MAX_BIO_LENGTH
                }
                disabled={saving}
                aria-invalid={Boolean(
                  errors.bio
                )}
                aria-describedby={
                  errors.bio
                    ? "profile-bio-error"
                    : "profile-bio-help"
                }
              />

              {errors.bio ? (
                <small
                  id="profile-bio-error"
                  className="field-error"
                  role="alert"
                >
                  {errors.bio}
                </small>
              ) : (
                <small
                  id="profile-bio-help"
                  className="field-help"
                >
                  A short introduction helps
                  teammates know who you are.
                </small>
              )}
            </div>

            {/* ================================================
                FORM FOOTER
            ================================================= */}

            <div className="profile-form-footer">
              <div className="profile-form-status">
                {saved && !isDirty && (
                  <span
                    className="save-success"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      aria-hidden="true"
                    >
                      ✓
                    </span>

                    Changes saved
                  </span>
                )}

                {hasFieldErrors && (
                  <span
                    className="save-error"
                    role="alert"
                  >
                    Please review the
                    highlighted fields.
                  </span>
                )}
              </div>

              <div className="profile-form-actions">
                {isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={
                      handleReset
                    }
                    disabled={
                      saving
                    }
                  >
                    Discard
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  disabled={
                    saving ||
                    !isDirty
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Save changes"}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* ====================================================
            ACCOUNT INFORMATION
        ==================================================== */}

        <Card
          title="Account"
          className="profile-account-card"
        >
          <div className="account-info-list">
            {/* ================================================
                ROLE
            ================================================= */}

            <div className="account-info-item">
              <span
                className="account-info-icon"
                aria-hidden="true"
              >
                ◉
              </span>

              <div>
                <strong>
                  Account role
                </strong>

                <small>
                  {userRole}
                </small>
              </div>
            </div>

            {/* ================================================
                EMAIL
            ================================================= */}

            <div className="account-info-item">
              <span
                className="account-info-icon"
                aria-hidden="true"
              >
                @
              </span>

              <div>
                <strong>
                  Email
                </strong>

                <small>
                  {userEmail ||
                    "Not available"}
                </small>
              </div>
            </div>

            {/* ================================================
                STATUS
            ================================================= */}

            <div className="account-info-item">
              <span
                className="account-info-icon"
                aria-hidden="true"
              >
                ✓
              </span>

              <div>
                <strong>
                  Account status
                </strong>

                <small className="account-status-active">
                  Active
                </small>
              </div>
            </div>

            {/* ================================================
                MEMBER SINCE
            ================================================= */}

            <div className="account-info-item">
              <span
                className="account-info-icon"
                aria-hidden="true"
              >
                ◷
              </span>

              <div>
                <strong>
                  Member since
                </strong>

                <small>
                  {joinedDate}
                </small>
              </div>
            </div>
          </div>

          <div className="profile-card-divider" />

          {/* ==================================================
              QUICK ACTIONS
          ================================================== */}

          <div className="profile-account-actions">
            <Link
              to="/workspace"
              className="profile-action-link"
            >
              <span>
                Workspace
              </span>

              <span aria-hidden="true">
                →
              </span>
            </Link>

            <Link
              to="/documents"
              className="profile-action-link"
            >
              <span>
                My documents
              </span>

              <span aria-hidden="true">
                →
              </span>
            </Link>

            <Link
              to="/settings"
              className="profile-action-link"
            >
              <span>
                Account settings
              </span>

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </Card>
      </div>

      {/* ======================================================
          SECURITY / PROFILE FOOTER
      ====================================================== */}

      <section
        className="profile-security-card"
        aria-label="Profile security"
      >
        <div className="profile-security-icon">
          ✓
        </div>

        <div className="profile-security-content">
          <strong>
            Your account is protected
          </strong>

          <p>
            Keep your account information
            accurate and review your security
            settings regularly.
          </p>
        </div>

        <Link
          to="/settings"
          className="profile-security-link"
        >
          Review settings
          <span aria-hidden="true">
            →
          </span>
        </Link>
      </section>
    </main>
  );
}

