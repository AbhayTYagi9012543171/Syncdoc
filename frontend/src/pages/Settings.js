
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  User,
  UserRound,
  X,
} from "lucide-react";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Avatar from "../components/common/Avatar";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import settingsService from "../services/settingsService";

/* ============================================================
   CONSTANTS
============================================================ */

const TABS = [
  {
    id: "profile",
    label: "Profile",
    description: "Personal information",
    icon: User,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Customize your interface",
    icon: Palette,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Manage alerts",
    icon: Bell,
  },
  {
    id: "security",
    label: "Security",
    description: "Protect your account",
    icon: ShieldCheck,
  },
];

const INITIAL_APPEARANCE = {
  theme: "system",
  compactMode: false,
  reducedMotion: false,
};

const INITIAL_NOTIFICATIONS = {
  email: true,
  mentions: true,
  documentUpdates: true,
  workspaceActivity: true,
};

const INITIAL_SECURITY = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

/* ============================================================
   HELPERS
============================================================ */

function getUserName(user) {
  return (
    user?.displayName ||
    user?.name ||
    user?.username ||
    user?.fullName ||
    "User"
  );
}

function getUserEmail(user) {
  return user?.email || "you@example.com";
}

function getUserRole(user) {
  const role =
    user?.role ||
    user?.userRole ||
    user?.workspaceRole ||
    "Member";

  return String(role)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: "",
    };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

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

/* ============================================================
   SETTINGS
============================================================ */

export default function Settings() {
  const { user, logout } = useAuth();

  /* ==========================================================
     USER
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

  /* ==========================================================
     TAB
  ========================================================== */

  const [activeTab, setActiveTab] =
    useState("profile");

  /* ==========================================================
     PROFILE
  ========================================================== */

  const [profile, setProfile] = useState({
    name: userName,
    email: userEmail,
    username: user?.username || "",
  });

  /* ==========================================================
     APPEARANCE
  ========================================================== */

  const [appearance, setAppearance] =
    useState(INITIAL_APPEARANCE);

  /* ==========================================================
     NOTIFICATIONS
  ========================================================== */

  const [notifications, setNotifications] =
    useState(INITIAL_NOTIFICATIONS);

  /* ==========================================================
     SECURITY
  ========================================================== */

  const [security, setSecurity] =
    useState(INITIAL_SECURITY);

  const [passwordVisibility, setPasswordVisibility] =
    useState({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });

  /* ==========================================================
     UI STATE
  ========================================================== */

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* ==========================================================
     USER SYNC
  ========================================================== */

  useEffect(() => {
    setProfile({
      name: userName,
      email: userEmail,
      username: user?.username || "",
    });
  }, [user, userName, userEmail]);

  /* ==========================================================
     LOAD PERSISTED SETTINGS
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const saved = await settingsService.get();
        if (!mounted || !saved) return;

        if (saved.preferences) {
          setAppearance((previous) => ({
            ...previous,
            ...saved.preferences,
          }));
        }

        if (saved.notifications) {
          setNotifications((previous) => ({
            ...previous,
            ...saved.notifications,
          }));
        }
      } catch (loadError) {
        console.warn("SyncDoc: unable to load settings.", loadError);
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     PASSWORD STRENGTH
  ========================================================== */

  const passwordStrength = useMemo(
    () =>
      getPasswordStrength(
        security.newPassword
      ),
    [security.newPassword]
  );

  /* ==========================================================
     CURRENT TAB
  ========================================================== */

  const currentTab = useMemo(
    () =>
      TABS.find(
        (tab) => tab.id === activeTab
      ) || TABS[0],
    [activeTab]
  );

  /* ==========================================================
     FEEDBACK
  ========================================================== */

  const clearFeedback = useCallback(() => {
    setMessage("");
    setError("");
  }, []);

  /* ==========================================================
     PROFILE HANDLER
  ========================================================== */

  const handleProfileChange = useCallback(
    (event) => {
      const { name, value } = event.target;

      setProfile((previous) => ({
        ...previous,
        [name]: value,
      }));

      clearFeedback();
    },
    [clearFeedback]
  );

  /* ==========================================================
     APPEARANCE HANDLER
  ========================================================== */

  const handleAppearanceChange =
    useCallback(
      (event) => {
        const {
          name,
          value,
          type,
          checked,
        } = event.target;

        setAppearance((previous) => ({
          ...previous,
          [name]:
            type === "checkbox"
              ? checked
              : value,
        }));

        clearFeedback();
      },
      [clearFeedback]
    );

  /* ==========================================================
     NOTIFICATION HANDLER
  ========================================================== */

  const handleNotificationChange =
    useCallback(
      (event) => {
        const {
          name,
          checked,
        } = event.target;

        setNotifications(
          (previous) => ({
            ...previous,
            [name]: checked,
          })
        );

        clearFeedback();
      },
      [clearFeedback]
    );

  /* ==========================================================
     SECURITY HANDLER
  ========================================================== */

  const handleSecurityChange =
    useCallback(
      (event) => {
        const {
          name,
          value,
        } = event.target;

        setSecurity((previous) => ({
          ...previous,
          [name]: value,
        }));

        clearFeedback();
      },
      [clearFeedback]
    );

  /* ==========================================================
     PASSWORD VISIBILITY
  ========================================================== */

  const togglePasswordVisibility =
    useCallback((field) => {
      setPasswordVisibility(
        (previous) => ({
          ...previous,
          [field]:
            !previous[field],
        })
      );
    }, []);

  /* ==========================================================
     TAB CHANGE
  ========================================================== */

  const handleTabChange = useCallback(
    (tabId) => {
      if (saving) return;

      clearFeedback();
      setActiveTab(tabId);
    },
    [saving, clearFeedback]
  );

  /* ==========================================================
     SECURITY VALIDATION
  ========================================================== */

  const validateSecurity =
    useCallback(() => {
      const {
        currentPassword,
        newPassword,
        confirmPassword,
      } = security;

      if (!currentPassword) {
        return "Please enter your current password.";
      }

      if (!newPassword) {
        return "Please enter a new password.";
      }

      if (newPassword.length < 8) {
        return "Your new password must contain at least 8 characters.";
      }

      if (newPassword === currentPassword) {
        return "Your new password must be different from your current password.";
      }

      if (!confirmPassword) {
        return "Please confirm your new password.";
      }

      if (newPassword !== confirmPassword) {
        return "New passwords do not match.";
      }

      return "";
    }, [security]);

  /* ==========================================================
     SAVE
  ========================================================== */

  const handleSave = useCallback(
    async (event) => {
      event?.preventDefault();

      if (saving) return;

      clearFeedback();

      /* ------------------------------------------------------
         PROFILE
      ------------------------------------------------------ */

      if (activeTab === "profile") {
        const name = profile.name.trim();

        if (!name) {
          setError(
            "Please enter your display name."
          );
          return;
        }

        if (name.length < 2) {
          setError(
            "Your display name must contain at least 2 characters."
          );
          return;
        }
      }

      /* ------------------------------------------------------
         SECURITY
      ------------------------------------------------------ */

      if (activeTab === "security") {
        const securityError =
          validateSecurity();

        if (securityError) {
          setError(securityError);
          return;
        }
      }

      setSaving(true);

      try {
        /*
         * ====================================================
         * API INTEGRATION
         * ====================================================
         *
         * Replace these placeholders with your services.
         *
         * Profile:
         * await userService.updateProfile({
         *   name: profile.name.trim(),
         *   username: profile.username.trim(),
         * });
         *
         * Appearance:
         * await userService.updatePreferences(appearance);
         *
         * Notifications:
         * await userService.updateNotifications(
         *   notifications
         * );
         *
         * Security:
         * await userService.changePassword({
         *   currentPassword:
         *     security.currentPassword,
         *   newPassword:
         *     security.newPassword,
         * });
         */

        if (activeTab === "profile") {
          const updated = await authService.updateProfile({
            displayName: profile.name.trim(),
            username: profile.username.trim(),
          });

          if (updated?.user) {
            // AuthContext owns session state; the page remains
            // immediately responsive even when the API returns
            // a wrapped response.
          }
        } else if (activeTab === "security") {
          await authService.updatePassword({
            currentPassword: security.currentPassword,
            newPassword: security.newPassword,
          });

          setSecurity(INITIAL_SECURITY);
          setPasswordVisibility({
            currentPassword: false,
            newPassword: false,
            confirmPassword: false,
          });
        } else {
          await settingsService.update({
            preferences: appearance,
            notifications,
          });
        }

        setMessage(
          `${currentTab.label} settings saved successfully.`
        );
      } catch (err) {
        console.error(
          "SyncDoc settings update failed:",
          err
        );

        setError(
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unable to save your settings. Please try again."
        );
      } finally {
        setSaving(false);
      }
    },
    [
      activeTab,
      profile,
      security,
      currentTab,
      notifications,
      appearance,
      saving,
      validateSecurity,
      clearFeedback,
    ]
  );

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const handleLogout = useCallback(() => {
    if (saving) return;

    const confirmed = window.confirm(
      "Are you sure you want to sign out of SyncDoc?"
    );

    if (!confirmed) return;

    if (typeof logout === "function") {
      logout();
    }
  }, [logout, saving]);

  /* ==========================================================
     THEME PREVIEW / APPLICATION
  ========================================================== */

  useEffect(() => {
    const root =
      document.documentElement;

    root.dataset.theme =
      appearance.theme;

    root.classList.toggle(
      "compact-mode",
      appearance.compactMode
    );

    root.classList.toggle(
      "reduced-motion",
      appearance.reducedMotion
    );

    return () => {
      root.classList.remove(
        "compact-mode"
      );

      root.classList.remove(
        "reduced-motion"
      );
    };
  }, [
    appearance.theme,
    appearance.compactMode,
    appearance.reducedMotion,
  ]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="page settings-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="page-heading settings-page-heading">
        <div className="page-heading-content">
          <div className="eyebrow-row">
            <span className="eyebrow">
              ACCOUNT
            </span>

            <span className="settings-live-status">
              <span
                className="settings-live-dot"
                aria-hidden="true"
              />

              Settings
            </span>
          </div>

          <h1>Settings</h1>

          <p>
            Manage your account, workspace
            preferences, notifications and
            security.
          </p>
        </div>
      </header>

      {/* ======================================================
          FEEDBACK
      ====================================================== */}

      {(message || error) && (
        <div
          className={
            error
              ? "settings-alert settings-alert-error"
              : "settings-alert settings-alert-success"
          }
          role="status"
          aria-live="polite"
        >
          <span
            className="settings-alert-icon"
            aria-hidden="true"
          >
            {error ? (
              <X size={17} />
            ) : (
              <Check size={17} />
            )}
          </span>

          <div>
            <strong>
              {error
                ? "Something went wrong"
                : "Changes saved"}
            </strong>

            <p>
              {error || message}
            </p>
          </div>

          <button
            type="button"
            className="settings-alert-close"
            onClick={clearFeedback}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ======================================================
          SETTINGS LAYOUT
      ====================================================== */}

      <div className="settings-layout">

        {/* ====================================================
            NAVIGATION
        ==================================================== */}

        <aside className="settings-sidebar">

          {/* User summary */}

          <div className="settings-user-card">
            <Avatar
              user={user}
              name={userName}
              size="lg"
            />

            <div className="settings-user-info">
              <strong>
                {userName}
              </strong>

              <span>
                {userEmail}
              </span>

              <small>
                {userRole}
              </small>
            </div>
          </div>

          <div className="settings-nav-divider" />

          <nav
            className="settings-nav"
            aria-label="Settings navigation"
          >
            {TABS.map((tab) => {
              const active =
                activeTab === tab.id;

              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={
                    active
                      ? "settings-nav-item active"
                      : "settings-nav-item"
                  }
                  onClick={() =>
                    handleTabChange(
                      tab.id
                    )
                  }
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  disabled={saving}
                >
                  <span className="settings-nav-icon">
                    <Icon size={17} />
                  </span>

                  <span className="settings-nav-copy">
                    <strong>
                      {tab.label}
                    </strong>

                    <small>
                      {tab.description}
                    </small>
                  </span>

                  <ChevronRight
                    size={15}
                    className="settings-nav-arrow"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </nav>

          <div className="settings-sidebar-footer">
            <div className="settings-security-mini">
              <ShieldCheck
                size={17}
              />

              <div>
                <strong>
                  Account protected
                </strong>

                <small>
                  Secure authenticated session
                </small>
              </div>
            </div>
          </div>
        </aside>

        {/* ====================================================
            CONTENT
        ==================================================== */}

        <section
          className="settings-main"
          aria-labelledby="settings-section-title"
        >
          <Card
            className="settings-card"
          >
            <div className="settings-card-header">
              <div>
                <span className="settings-card-eyebrow">
                  {currentTab.label.toUpperCase()}
                </span>

                <h2 id="settings-section-title">
                  {currentTab.label}
                </h2>

                <p>
                  {currentTab.description}
                </p>
              </div>

              <div className="settings-card-icon">
                {React.createElement(
                  currentTab.icon,
                  { size: 20 }
                )}
              </div>
            </div>

            <div className="settings-content">

              {/* ==================================================
                  PROFILE
              ================================================== */}

              {activeTab ===
                "profile" && (
                  <form
                    className="settings-section"
                    onSubmit={handleSave}
                  >
                    <div className="settings-section-intro">
                      <h3>
                        Personal information
                      </h3>

                      <p>
                        Update the information
                        associated with your
                        SyncDoc identity.
                      </p>
                    </div>

                    <div className="settings-profile-preview">
                      <Avatar
                        user={user}
                        name={userName}
                        size="xl"
                      />

                      <div>
                        <strong>
                          {userName}
                        </strong>

                        <span>
                          {userEmail}
                        </span>

                        <small>
                          {userRole}
                        </small>
                      </div>
                    </div>

                    <div className="settings-divider" />

                    <div className="form-grid">

                      <label>
                        <span>
                          Display name
                        </span>

                        <input
                          name="name"
                          type="text"
                          value={profile.name}
                          onChange={
                            handleProfileChange
                          }
                          placeholder="Your name"
                          autoComplete="name"
                          maxLength={80}
                          required
                          disabled={saving}
                        />

                        <small className="field-help">
                          This name will be
                          visible to your
                          collaborators.
                        </small>
                      </label>

                      <label>
                        <span>
                          Username
                        </span>

                        <input
                          name="username"
                          type="text"
                          value={
                            profile.username
                          }
                          onChange={
                            handleProfileChange
                          }
                          placeholder="username"
                          autoComplete="username"
                          maxLength={40}
                          disabled={saving}
                        />

                        <small className="field-help">
                          Your unique SyncDoc
                          username.
                        </small>
                      </label>

                      <label className="form-field-full">
                        <span>
                          Email address
                        </span>

                        <input
                          name="email"
                          type="email"
                          value={
                            profile.email
                          }
                          readOnly
                          disabled
                        />

                        <small className="field-help">
                          Your email address
                          cannot be edited
                          from this screen.
                        </small>
                      </label>
                    </div>

                    <div className="settings-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={saving}
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : "Save changes"}
                      </Button>
                    </div>
                  </form>
                )}

              {/* ==================================================
                  APPEARANCE
              ================================================== */}

              {activeTab ===
                "appearance" && (
                  <form
                    className="settings-section"
                    onSubmit={handleSave}
                  >
                    <div className="settings-section-intro">
                      <h3>
                        Interface appearance
                      </h3>

                      <p>
                        Personalize how SyncDoc
                        looks and behaves.
                      </p>
                    </div>

                    {/* Theme */}

                    <div className="appearance-theme-section">
                      <div className="setting-heading">
                        <div>
                          <strong>
                            Interface theme
                          </strong>

                          <small>
                            Select the appearance
                            that works best for
                            you.
                          </small>
                        </div>
                      </div>

                      <div
                        className="theme-options"
                        role="radiogroup"
                        aria-label="Interface theme"
                      >
                        <ThemeOption
                          value="system"
                          label="System"
                          icon={Monitor}
                          selected={
                            appearance.theme ===
                            "system"
                          }
                          onClick={() =>
                            setAppearance(
                              (previous) => ({
                                ...previous,
                                theme: "system",
                              })
                            )
                          }
                        />

                        <ThemeOption
                          value="light"
                          label="Light"
                          icon={Sun}
                          selected={
                            appearance.theme ===
                            "light"
                          }
                          onClick={() =>
                            setAppearance(
                              (previous) => ({
                                ...previous,
                                theme: "light",
                              })
                            )
                          }
                        />

                        <ThemeOption
                          value="dark"
                          label="Dark"
                          icon={Moon}
                          selected={
                            appearance.theme ===
                            "dark"
                          }
                          onClick={() =>
                            setAppearance(
                              (previous) => ({
                                ...previous,
                                theme: "dark",
                              })
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-options">

                      <SettingToggle
                        name="compactMode"
                        checked={
                          appearance.compactMode
                        }
                        onChange={
                          handleAppearanceChange
                        }
                        title="Compact mode"
                        description="Reduce spacing so more documents and workspace content fit on screen."
                      />

                      <SettingToggle
                        name="reducedMotion"
                        checked={
                          appearance.reducedMotion
                        }
                        onChange={
                          handleAppearanceChange
                        }
                        title="Reduced motion"
                        description="Minimize animations and transitions throughout the interface."
                      />
                    </div>

                    <div className="settings-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={saving}
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : "Save preferences"}
                      </Button>
                    </div>
                  </form>
                )}

              {/* ==================================================
                  NOTIFICATIONS
              ================================================== */}

              {activeTab ===
                "notifications" && (
                  <form
                    className="settings-section"
                    onSubmit={handleSave}
                  >
                    <div className="settings-section-intro">
                      <h3>
                        Notification preferences
                      </h3>

                      <p>
                        Choose which events should
                        generate notifications.
                      </p>
                    </div>

                    <div className="settings-options">

                      <SettingToggle
                        name="email"
                        checked={
                          notifications.email
                        }
                        onChange={
                          handleNotificationChange
                        }
                        title="Email notifications"
                        description="Receive important SyncDoc updates by email."
                      />

                      <SettingToggle
                        name="mentions"
                        checked={
                          notifications.mentions
                        }
                        onChange={
                          handleNotificationChange
                        }
                        title="Mentions"
                        description="Get notified when another collaborator mentions you."
                      />

                      <SettingToggle
                        name="documentUpdates"
                        checked={
                          notifications.documentUpdates
                        }
                        onChange={
                          handleNotificationChange
                        }
                        title="Document updates"
                        description="Receive notifications when shared documents are changed."
                      />

                      <SettingToggle
                        name="workspaceActivity"
                        checked={
                          notifications.workspaceActivity
                        }
                        onChange={
                          handleNotificationChange
                        }
                        title="Workspace activity"
                        description="Stay informed about important workspace activity."
                      />
                    </div>

                    <div className="settings-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={saving}
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : "Save notifications"}
                      </Button>
                    </div>
                  </form>
                )}

              {/* ==================================================
                  SECURITY
              ================================================== */}

              {activeTab ===
                "security" && (
                  <form
                    className="settings-section"
                    onSubmit={handleSave}
                  >
                    <div className="settings-section-intro">
                      <h3>
                        Password & security
                      </h3>

                      <p>
                        Manage your password and
                        protect your authenticated
                        session.
                      </p>
                    </div>

                    {/* Security status */}

                    <div className="security-status">
                      <div className="security-status-icon">
                        <ShieldCheck
                          size={21}
                        />
                      </div>

                      <div>
                        <strong>
                          Account security is active
                        </strong>

                        <small>
                          Your SyncDoc account
                          requires authenticated
                          access.
                        </small>
                      </div>

                      <span className="security-status-badge">
                        Protected
                      </span>
                    </div>

                    <div className="settings-divider" />

                    {/* Password */}

                    <div className="security-form">

                      <PasswordInput
                        label="Current password"
                        name="currentPassword"
                        value={
                          security.currentPassword
                        }
                        onChange={
                          handleSecurityChange
                        }
                        visible={
                          passwordVisibility.currentPassword
                        }
                        onToggle={() =>
                          togglePasswordVisibility(
                            "currentPassword"
                          )
                        }
                        placeholder="Enter current password"
                        autoComplete="current-password"
                        disabled={saving}
                      />

                      <PasswordInput
                        label="New password"
                        name="newPassword"
                        value={
                          security.newPassword
                        }
                        onChange={
                          handleSecurityChange
                        }
                        visible={
                          passwordVisibility.newPassword
                        }
                        onToggle={() =>
                          togglePasswordVisibility(
                            "newPassword"
                          )
                        }
                        placeholder="Create a new password"
                        autoComplete="new-password"
                        disabled={saving}
                      />

                      {/* Strength */}

                      {security.newPassword && (
                        <div className="password-strength">
                          <div className="password-strength-header">
                            <span>
                              Password strength
                            </span>

                            <strong>
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
                        </div>
                      )}

                      <PasswordInput
                        label="Confirm new password"
                        name="confirmPassword"
                        value={
                          security.confirmPassword
                        }
                        onChange={
                          handleSecurityChange
                        }
                        visible={
                          passwordVisibility.confirmPassword
                        }
                        onToggle={() =>
                          togglePasswordVisibility(
                            "confirmPassword"
                          )
                        }
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                        disabled={saving}
                      />

                      {security.confirmPassword &&
                        security.newPassword ===
                        security.confirmPassword && (
                          <div className="password-match">
                            <Check size={15} />
                            Passwords match
                          </div>
                        )}
                    </div>

                    <div className="password-requirements">
                      <strong>
                        Password requirements
                      </strong>

                      <ul>
                        <li
                          className={
                            security.newPassword.length >=
                              8
                              ? "complete"
                              : ""
                          }
                        >
                          <Check size={13} />
                          At least 8 characters
                        </li>

                        <li
                          className={
                            /[A-Z]/.test(
                              security.newPassword
                            )
                              ? "complete"
                              : ""
                          }
                        >
                          <Check size={13} />
                          One uppercase letter
                        </li>

                        <li
                          className={
                            /[0-9]/.test(
                              security.newPassword
                            )
                              ? "complete"
                              : ""
                          }
                        >
                          <Check size={13} />
                          One number
                        </li>

                        <li
                          className={
                            /[^A-Za-z0-9]/.test(
                              security.newPassword
                            )
                              ? "complete"
                              : ""
                          }
                        >
                          <Check size={13} />
                          One special character
                        </li>
                      </ul>
                    </div>

                    <div className="settings-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={saving}
                        disabled={saving}
                      >
                        {saving
                          ? "Updating..."
                          : "Update password"}
                      </Button>
                    </div>

                    {/* ==================================================
                      DANGER ZONE
                  ================================================== */}

                    <div className="danger-zone">
                      <div className="danger-zone-icon">
                        <LogOut size={19} />
                      </div>

                      <div className="danger-zone-content">
                        <span className="eyebrow">
                          SESSION
                        </span>

                        <h3>
                          Sign out of SyncDoc
                        </h3>

                        <p>
                          End your current
                          authenticated session on
                          this device.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="danger"
                        onClick={
                          handleLogout
                        }
                        disabled={saving}
                      >
                        <LogOut size={15} />
                        Sign out
                      </Button>
                    </div>
                  </form>
                )}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   THEME OPTION
============================================================ */

function ThemeOption({
  value,
  label,
  icon: Icon,
  selected,
  onClick,
}) {
  return (
    <button
      type="button"
      className={
        selected
          ? "theme-option active"
          : "theme-option"
      }
      onClick={onClick}
      role="radio"
      aria-checked={selected}
    >
      <span className="theme-option-icon">
        <Icon size={19} />
      </span>

      <span>
        {label}
      </span>

      {selected && (
        <span
          className="theme-option-check"
          aria-hidden="true"
        >
          <Check size={13} />
        </span>
      )}
    </button>
  );
}

/* ============================================================
   SETTING TOGGLE
============================================================ */

function SettingToggle({
  name,
  checked,
  onChange,
  title,
  description,
}) {
  return (
    <label className="setting-row setting-toggle">
      <span className="setting-row-icon">
        <Check size={16} />
      </span>

      <span className="setting-row-content">
        <strong>
          {title}
        </strong>

        <small>
          {description}
        </small>
      </span>

      <span className="toggle-control">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
        />

        <span
          className="toggle-slider"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

/* ============================================================
   PASSWORD INPUT
============================================================ */

function PasswordInput({
  label,
  name,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  autoComplete,
  disabled,
}) {
  return (
    <label className="password-input-group">
      <span>
        {label}
      </span>

      <div className="password-field">
        <Lock
          size={16}
          className="password-field-icon"
          aria-hidden="true"
        />

        <input
          name={name}
          type={
            visible
              ? "text"
              : "password"
          }
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          minLength={8}
        />

        <button
          type="button"
          className="password-visibility-button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          title={
            visible
              ? "Hide password"
              : "Show password"
          }
        >
          {visible ? (
            <EyeOff size={16} />
          ) : (
            <Eye size={16} />
          )}
        </button>
      </div>
    </label>
  );
}

