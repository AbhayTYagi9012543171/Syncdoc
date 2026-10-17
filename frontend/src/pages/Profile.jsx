import "./pages-premium.css";
import "./profile-premium.css";

import resolveAssetUrl from '../utils/resolveAssetUrl';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  ImagePlus,
  LoaderCircle,
  Mail,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { useAuth } from "../context/AuthContext";
import profileService from "../services/profileService";

const MAX_NAME_LENGTH = 50;
const MAX_BIO_LENGTH = 500;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function displayName(user) {
  return String(
    user?.displayName ||
      user?.name ||
      user?.username ||
      user?.fullName ||
      "User"
  );
}

function initials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);

  if (!words.length) return "U";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function memberSince(user) {
  const value =
    user?.createdAt ||
    user?.created_at ||
    user?.joinedAt ||
    user?.dateJoined;

  if (!value || Number.isNaN(new Date(value).getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function roleLabel(user) {
  const role = String(
    user?.role ||
      user?.workspaceRole ||
      user?.permissions?.role ||
      "Member"
  ).trim();

  return role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "Member";
}

function getResponseUser(result) {
  return (
    result?.user ||
    result?.data?.user ||
    result?.data?.data?.user ||
    result?.data ||
    result ||
    null
  );
}

function validateProfile(form) {
  const errors = { name: "", bio: "" };
  const name = form.name.trim();

  if (!name) {
    errors.name = "Display name is required.";
  } else if (name.length < 2) {
    errors.name = "Use at least 2 characters.";
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Maximum ${MAX_NAME_LENGTH} characters.`;
  }

  if (form.bio.length > MAX_BIO_LENGTH) {
    errors.bio = `Maximum ${MAX_BIO_LENGTH} characters.`;
  }

  return errors;
}

function Stat({ icon: Icon, label, value, detail }) {
  return (
    <motion.div
      className="profile-stat"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
    >
      <span className="profile-stat-icon">
        <Icon size={19} aria-hidden="true" />
      </span>

      <div className="profile-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </motion.div>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const reduceMotion = useReducedMotion();

  const [form, setForm] = useState({
    name: user?.displayName || user?.name || "",
    bio: user?.bio || "",
  });

  const [savedForm, setSavedForm] = useState({
    name: user?.displayName || user?.name || "",
    bio: user?.bio || "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    bio: "",
  });
  const [notice, setNotice] = useState("");

  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoUrl, setPhotoUrl] = useState(user?.avatar || "");
  const [photoError, setPhotoError] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);

  const fileInputRef = useRef(null);

  const name = form.name.trim() || displayName(user);
  const email = user?.email || user?.emailAddress || "";
  const role = roleLabel(user);
  const joined = memberSince(user);
  const bioLength = form.bio.length;

  const isDirty =
    form.name !== savedForm.name ||
    form.bio !== savedForm.bio;

  const currentErrors = useMemo(
    () => validateProfile(form),
    [form]
  );

  const completion = useMemo(() => {
    const checks = [
      Boolean(form.name.trim()),
      Boolean(email),
      Boolean(form.bio.trim()),
      Boolean(user?.avatar),
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100
    );
  }, [form, email, user?.avatar]);

  useEffect(() => {
    const nextForm = {
      name: user?.displayName || user?.name || "",
      bio: user?.bio || "",
    };

    setForm(nextForm);
    setSavedForm(nextForm);
    setPhotoUrl(user?.avatar || "");
    setPhotoFile(null);
    setPhotoPreview("");
    setFieldErrors({ name: "", bio: "" });
    setFormError("");
    setSaved(false);
  }, [user]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const changeField = useCallback((event) => {
    const { name: field, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaved(false);
    setNotice("");
    setFormError("");

    setFieldErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  }, []);

  const blurField = useCallback(
    (event) => {
      const field = event.target.name;
      const errors = validateProfile(form);

      if (field === "name" || field === "bio") {
        setFieldErrors((previous) => ({
          ...previous,
          [field]: errors[field],
        }));
      }
    },
    [form]
  );

  const discardChanges = useCallback(() => {
    if (saving) return;

    setForm(savedForm);
    setFieldErrors({ name: "", bio: "" });
    setFormError("");
    setSaved(false);
  }, [saving, savedForm]);

  const saveProfile = useCallback(
    async (event) => {
      event.preventDefault();

      if (saving) return;

      const errors = validateProfile(form);
      setFieldErrors(errors);

      if (errors.name || errors.bio) {
        setFormError("Please fix the highlighted fields.");
        return;
      }

      if (!isDirty) {
        setSaved(true);
        return;
      }

      setSaving(true);
      setSaved(false);
      setFormError("");
      setNotice("");

      try {
        const result = await profileService.update({
          displayName: form.name.trim(),
          bio: form.bio.trim(),
        });

        const updated = getResponseUser(result);
        const nextForm = {
          name:
            updated?.displayName ||
            updated?.name ||
            form.name.trim(),
          bio: updated?.bio ?? form.bio.trim(),
        };

        if (typeof updateUser === "function") {
          updateUser({
            ...(updated && typeof updated === "object" ? updated : {}),
            displayName: nextForm.name,
            name: nextForm.name,
            bio: nextForm.bio,
          });
        }

        setForm(nextForm);
        setSavedForm(nextForm);
        setSaved(true);
        setNotice("Your profile has been saved.");
      } catch (error) {
        setFormError(
          error?.userMessage ||
            error?.response?.data?.message ||
            "Unable to save your profile. Please try again."
        );
      } finally {
        setSaving(false);
      }
    },
    [form, saving, isDirty, updateUser]
  );

  const openPhotoEditor = useCallback(() => {
    setPhotoUrl(user?.avatar || "");
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoError("");
    setPhotoEditorOpen(true);
  }, [user?.avatar]);

  const closePhotoEditor = useCallback(() => {
    if (photoSaving) return;

    setPhotoEditorOpen(false);
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [photoSaving]);

  const choosePhoto = useCallback((event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError(
        "Choose a JPG, PNG, WEBP, or GIF image. SVG is not supported."
      );
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("Your photo must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setPhotoError("");
    setPhotoFile(file);
    setPhotoUrl("");

    setPhotoPreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return URL.createObjectURL(file);
    });
  }, []);

  const savePhoto = useCallback(
    async (event) => {
      event.preventDefault();

      if (photoSaving) return;

      setPhotoSaving(true);
      setPhotoError("");
      setNotice("");

      try {
        let result;

        if (photoFile) {
          result = await profileService.uploadAvatar(photoFile);
        } else {
          const url = photoUrl.trim();

          if (url && !/^https:\/\//i.test(url)) {
            setPhotoError("Use a valid HTTPS image URL.");
            setPhotoSaving(false);
            return;
          }

          if (!url && user?.avatar) {
            result = await profileService.removeAvatar();
          } else if (url) {
            result = await profileService.update({ avatar: url });
          } else {
            setPhotoError("Choose a photo or enter an image URL.");
            setPhotoSaving(false);
            return;
          }
        }

        const updated = getResponseUser(result);
        const avatar =
          updated?.avatar ??
          result?.avatar ??
          result?.data?.avatar ??
          null;

        if (typeof updateUser === "function") {
          updateUser({
            ...(updated && typeof updated === "object" ? updated : {}),
            avatar,
          });
        }

        setPhotoUrl(avatar || "");
        setPhotoFile(null);
        setPhotoPreview("");
        setPhotoEditorOpen(false);
        setNotice(avatar ? "Profile photo updated." : "Profile photo removed.");
      } catch (error) {
        setPhotoError(
          error?.userMessage ||
            error?.response?.data?.message ||
            error?.message ||
            "Unable to update your photo. Please try again."
        );
      } finally {
        setPhotoSaving(false);
      }
    },
    [photoSaving, photoFile, photoUrl, user?.avatar, updateUser]
  );

  const removePhoto = useCallback(async () => {
    if (photoSaving) return;

    setPhotoSaving(true);
    setPhotoError("");

    try {
      const result = await profileService.removeAvatar();
      const updated = getResponseUser(result);

      if (typeof updateUser === "function") {
        updateUser({
          ...(updated && typeof updated === "object" ? updated : {}),
          avatar: null,
        });
      }

      setPhotoUrl("");
      setPhotoFile(null);
      setPhotoPreview("");
      setPhotoEditorOpen(false);
      setNotice("Profile photo removed.");
    } catch (error) {
      setPhotoError(
        error?.userMessage ||
          error?.response?.data?.message ||
          "Unable to remove your photo."
      );
    } finally {
      setPhotoSaving(false);
    }
  }, [photoSaving, updateUser]);

  return (
    <motion.main
      className="page profile-premium"
      aria-labelledby="profile-title"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <header className="profile-topbar">
        <div className="profile-heading-copy">
          <span className="profile-eyebrow">
            <SparklesIcon /> ACCOUNT WORKSPACE
          </span>
          <h1 id="profile-title">
            Your profile<span>.</span>
          </h1>
          <p>Manage your identity and how your team sees you.</p>
        </div>

        <div className="profile-topbar-actions">
          {isDirty && (
            <span className="profile-dirty-pill" role="status">
              <span /> Unsaved changes
            </span>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              window.location.assign("/settings");
            }}
          >
            <Settings2 size={16} /> Settings
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {notice && (
          <motion.div
            className="profile-toast"
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <CheckCircle2 size={17} />
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss message"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section
        className="profile-hero-premium"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.32 }}
      >
        <div className="profile-hero-glow" />

        <div className="profile-hero-main">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-ring">
              {user?.avatar ? (
                <img src={resolveAssetUrl(user.avatar)} alt={`${name}'s profile`} />
              ) : (
                <span className="profile-avatar-fallback">
                  {initials(name)}
                </span>
              )}
            </div>

            <button
              type="button"
              className="profile-avatar-edit"
              onClick={openPhotoEditor}
              aria-label="Change profile photo"
            >
              <ImagePlus size={16} />
            </button>
          </div>

          <div className="profile-hero-identity">
            <div className="profile-name-line">
              <h2>{name}</h2>
              <span className="profile-verified">
                <BadgeCheck size={14} /> {role}
              </span>
            </div>

            <p className="profile-hero-email">
              <Mail size={15} />
              {email || "Email not available"}
            </p>

            <div className="profile-hero-meta">
              <span><Clock3 size={14} /> Member since {joined}</span>
              <span><ShieldCheck size={14} /> Account active</span>
            </div>

            {form.bio && (
              <p className="profile-hero-bio">{form.bio}</p>
            )}

            <button
              type="button"
              className="profile-photo-text-button"
              onClick={openPhotoEditor}
            >
              Update profile photo <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="profile-completion-panel">
          <div className="profile-completion-top">
            <span>Profile strength</span>
            <strong>{completion}%</strong>
          </div>

          <div
            className="profile-completion-track"
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
          >
            <motion.span
              initial={false}
              animate={{ width: `${completion}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.55 }}
            />
          </div>

          <p>
            {completion === 100
              ? "Looking good — your profile is complete."
              : "Add a few details to help your team recognize you."}
          </p>

          <div className="profile-completion-checks">
            <span className={form.name.trim() ? "complete" : ""}>
              <Check size={12} /> Name
            </span>
            <span className={email ? "complete" : ""}>
              <Check size={12} /> Email
            </span>
            <span className={form.bio.trim() ? "complete" : ""}>
              <Check size={12} /> About
            </span>
            <span className={user?.avatar ? "complete" : ""}>
              <Check size={12} /> Photo
            </span>
          </div>
        </div>
      </motion.section>

      <section className="profile-stats-grid" aria-label="Profile overview">
        <Stat
          icon={UserRound}
          label="Account type"
          value={role}
          detail="Your current role"
        />
        <Stat
          icon={ShieldCheck}
          label="Account status"
          value="Active"
          detail="Access is enabled"
        />
        <Stat
          icon={Clock3}
          label="Member since"
          value={joined}
          detail="Your SyncDoc journey"
        />
      </section>

      <div className="profile-content-grid">
        <Card title="Personal information" className="profile-edit-card">
          <div className="profile-card-intro">
            <span className="profile-section-icon"><UserRound size={18} /></span>
            <p>These details help teammates recognize you across SyncDoc.</p>
          </div>

          <form className="profile-premium-form" onSubmit={saveProfile} noValidate>
            <AnimatePresence>
              {formError && (
                <motion.div
                  className="profile-form-alert"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <X size={17} />
                  <span>{formError}</span>
                  <button type="button" onClick={() => setFormError("")} aria-label="Dismiss error">
                    <X size={15} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="profile-fields-grid">
              <div className="profile-field">
                <label htmlFor="profile-name">Display name <span>*</span></label>
                <input
                  id="profile-name"
                  name="name"
                  value={form.name}
                  onChange={changeField}
                  onBlur={blurField}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="name"
                  placeholder="Your name"
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby="profile-name-help"
                />
                {fieldErrors.name ? (
                  <small className="profile-field-error">{fieldErrors.name}</small>
                ) : (
                  <small id="profile-name-help">This name is visible to your teammates.</small>
                )}
              </div>

              <div className="profile-field">
                <label htmlFor="profile-email">Email address</label>
                <div className="profile-input-with-icon">
                  <Mail size={16} />
                  <input id="profile-email" value={email} disabled readOnly />
                </div>
                <small>Email is managed by your account sign-in.</small>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-bio-label">
                <label htmlFor="profile-bio">About you</label>
                <span className="profile-character-count">
                  {bioLength}/{MAX_BIO_LENGTH}
                </span>
              </div>

              <textarea
                id="profile-bio"
                name="bio"
                value={form.bio}
                onChange={changeField}
                onBlur={blurField}
                maxLength={MAX_BIO_LENGTH}
                rows={5}
                placeholder="Share a little about what you do or what you're working on..."
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.bio)}
              />

              {fieldErrors.bio ? (
                <small className="profile-field-error">{fieldErrors.bio}</small>
              ) : (
                <small>A short introduction helps your team know you better.</small>
              )}
            </div>

            <div className="profile-form-bottom">
              <div className="profile-save-status">
                {saved && !isDirty && (
                  <span className="profile-saved-label">
                    <CheckCircle2 size={16} /> All changes saved
                  </span>
                )}
                {!saved && isDirty && <span>Remember to save your changes.</span>}
              </div>

              <div className="profile-form-buttons">
                {isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={discardChanges}
                    disabled={saving}
                  >
                    <RotateCcw size={15} /> Discard
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    saving ||
                    !isDirty ||
                    Boolean(currentErrors.name || currentErrors.bio)
                  }
                >
                  {saving ? (
                    <><LoaderCircle className="profile-spin" size={16} /> Saving…</>
                  ) : (
                    <><Save size={16} /> Save changes</>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <div className="profile-side-column">
          <Card title="Your account" className="profile-account-panel">
            <div className="profile-account-list">
              <div className="profile-account-row">
                <span className="profile-account-icon"><Mail size={17} /></span>
                <div><small>Email address</small><strong>{email || "Not available"}</strong></div>
              </div>
              <div className="profile-account-row">
                <span className="profile-account-icon"><ShieldCheck size={17} /></span>
                <div><small>Account role</small><strong>{role}</strong></div>
              </div>
              <div className="profile-account-row">
                <span className="profile-account-icon"><CheckCircle2 size={17} /></span>
                <div><small>Account status</small><strong>Active</strong></div>
              </div>
            </div>

            <div className="profile-side-divider" />
            <h3 className="profile-quick-title">Quick links</h3>

            <nav className="profile-quick-links" aria-label="Account quick links">
              <Link to="/workspace"><span><BriefcaseBusiness size={16} /> Workspace</span><ChevronRight size={16} /></Link>
              <Link to="/documents"><span><FileText size={16} /> My documents</span><ChevronRight size={16} /></Link>
              <Link to="/settings"><span><Settings2 size={16} /> Account settings</span><ChevronRight size={16} /></Link>
            </nav>
          </Card>

          <motion.div
            className="profile-security-panel"
            whileHover={reduceMotion ? undefined : { y: -2 }}
          >
            <span className="profile-security-badge"><ShieldCheck size={20} /></span>
            <div>
              <strong>Your account, protected</strong>
              <p>Only your authenticated account can update these profile details.</p>
              <Link to="/settings">Review security settings <ArrowRight size={14} /></Link>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {photoEditorOpen && (
          <motion.div
            className="profile-modal-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !photoSaving
              ) {
                closePhotoEditor();
              }
            }}
          >
            <motion.section
              className="profile-avatar-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-avatar-title"
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="profile-modal-heading">
                <span className="profile-section-icon"><ImagePlus size={19} /></span>
                <button
                  type="button"
                  onClick={closePhotoEditor}
                  disabled={photoSaving}
                  aria-label="Close photo editor"
                >
                  <X size={18} />
                </button>
              </div>

              <h2 id="profile-avatar-title">Update your photo</h2>
              <p>Choose a photo that helps your teammates recognize you.</p>

              <form onSubmit={savePhoto}>
                <div className="profile-photo-upload-preview">
                  {photoPreview || user?.avatar ? (
                    <img
                      src={photoPreview || resolveAssetUrl(user.avatar)}
                      alt="Profile photo preview"
                    />
                  ) : (
                    <span><UserRound size={34} /></span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  id="profile-avatar-file"
                  className="profile-photo-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={choosePhoto}
                  aria-label="Choose profile photo"
                />

                <label className="profile-photo-dropzone" htmlFor="profile-avatar-file">
                  <Upload size={22} />
                  <strong>{photoFile ? photoFile.name : "Choose a photo to upload"}</strong>
                  <span>JPG, PNG, WEBP or GIF · Maximum 5 MB</span>
                </label>

                {photoError && (
                  <small className="profile-field-error" role="alert">
                    {photoError}
                  </small>
                )}

                <div className="profile-photo-url-divider">
                  <span>or use an image URL</span>
                </div>

                <label htmlFor="profile-avatar-url">Secure image URL</label>
                <input
                  id="profile-avatar-url"
                  type="url"
                  value={photoUrl}
                  onChange={(event) => {
                    setPhotoUrl(event.target.value);
                    setPhotoFile(null);
                    setPhotoPreview("");
                    setPhotoError("");

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  placeholder="https://example.com/photo.jpg"
                  disabled={Boolean(photoFile) || photoSaving}
                />

                <small className="profile-modal-hint">
                  Only upload images you own or have permission to use. The server validates uploaded files.
                </small>

                <div className="profile-modal-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={removePhoto}
                    disabled={photoSaving || !user?.avatar}
                  >
                    Remove photo
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={photoSaving || (!photoFile && !photoUrl.trim())}
                  >
                    {photoSaving ? (
                      <><LoaderCircle size={16} className="profile-spin" /> {photoFile ? "Uploading…" : "Saving…"}</>
                    ) : (
                      <><Upload size={16} /> {photoFile ? "Upload photo" : "Save photo"}</>
                    )}
                  </Button>
                </div>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only" aria-live="polite">
        {saved ? "Profile changes saved." : isDirty ? "Profile has unsaved changes." : "Profile is up to date."}
      </span>
    </motion.main>
  );
}

function SparklesIcon() {
  return <BadgeCheck size={13} aria-hidden="true" />;
}