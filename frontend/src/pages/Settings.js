import "./pages-premium.css";
import "./settings-premium.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, Check, ChevronRight, Eye, EyeOff, Lock, LogOut, Monitor, Moon, Palette, ShieldCheck, Sun, User, X, Mail, FileText, Users, Save, Sparkles, LoaderCircle, AlertTriangle } from "lucide-react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Avatar from "../components/common/Avatar";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import settingsService from "../services/settingsService";

const TABS = [
  { id: "profile", label: "Profile", description: "Personal information", icon: User },
  { id: "appearance", label: "Appearance", description: "Make SyncDoc yours", icon: Palette },
  { id: "notifications", label: "Notifications", description: "Choose what reaches you", icon: Bell },
  { id: "security", label: "Security", description: "Keep your account safe", icon: ShieldCheck },
];
const DEFAULT_APPEARANCE = { theme: "system", compactMode: false, reducedMotion: false };
const DEFAULT_NOTIFICATIONS = { email: true, mentions: true, documentUpdates: true, workspaceActivity: true };
const EMPTY_PASSWORD = { currentPassword: "", newPassword: "", confirmPassword: "" };
const errorText = (e) => e?.response?.data?.message || e?.response?.data?.error || e?.message || "Please try again.";
const userName = (user) => user?.displayName || user?.name || user?.username || "Your account";

function strengthOf(value) {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value)) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return { score, label: !value ? "Not entered" : score < 3 ? "Weak" : score < 5 ? "Good" : "Strong" };
}

export default function Settings() {
  const { user, logout, updateUser } = useAuth();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", username: "", email: "" });
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [password, setPassword] = useState(EMPTY_PASSWORD);
  const [shown, setShown] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const name = userName(user);
  const tab = useMemo(() => TABS.find((item) => item.id === activeTab) || TABS[0], [activeTab]);
  const strength = useMemo(() => strengthOf(password.newPassword), [password.newPassword]);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  useEffect(() => setProfile({ name: name === "Your account" ? "" : name, username: user?.username || "", email: user?.email || "" }), [user, name]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const result = await settingsService.get();
        const data = result?.data ?? result;
        if (!live || !data) return;
        setAppearance((p) => ({ ...p, ...(data.preferences || {}) }));
        setNotifications((p) => ({ ...p, ...(data.notifications || {}) }));
      } catch (error) {
        if (live) setFeedback({ type: "error", text: `Couldn't load saved settings. ${errorText(error)}` });
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = appearance.theme === "system" ? (systemDark ? "dark" : "light") : appearance.theme;
    };
    applyTheme();
    root.classList.toggle("compact-mode", !!appearance.compactMode);
    root.classList.toggle("reduced-motion", !!appearance.reducedMotion);
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", applyTheme);
    return () => {
      media?.removeEventListener?.("change", applyTheme);
      root.classList.remove("compact-mode", "reduced-motion");
    };
  }, [appearance]);

  const handleSave = useCallback(async (event) => {
    event?.preventDefault();
    if (saving) return;
    setFeedback(null);
    if (activeTab === "profile") {
      if (profile.name.trim().length < 2 || profile.name.trim().length > 50) {
        setFeedback({ type: "error", text: "Display name must be between 2 and 50 characters." }); return;
      }
      if (profile.username && !/^[a-zA-Z0-9_]{3,30}$/.test(profile.username.trim())) {
        setFeedback({ type: "error", text: "Username must be 3–30 characters using letters, numbers or underscores." }); return;
      }
    }
    if (activeTab === "security") {
      if (!password.currentPassword || !password.newPassword || !password.confirmPassword) {
        setFeedback({ type: "error", text: "Complete all password fields." }); return;
      }
      if (password.newPassword.length < 8) {
        setFeedback({ type: "error", text: "New password must contain at least 8 characters." }); return;
      }
      if (password.newPassword === password.currentPassword) {
        setFeedback({ type: "error", text: "New password must differ from the current password." }); return;
      }
      if (password.newPassword !== password.confirmPassword) {
        setFeedback({ type: "error", text: "The new passwords do not match." }); return;
      }
    }
    setSaving(true);
    try {
      if (activeTab === "profile") {
        const result = await authService.updateProfile({ displayName: profile.name.trim(), username: profile.username.trim() });
        const updated = result?.user || result?.data?.user || result?.data || result;
        if (updated && typeof updateUser === "function") updateUser(updated);
      } else if (activeTab === "security") {
        await authService.updatePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
        setPassword(EMPTY_PASSWORD); setShown({});
      } else {
        await settingsService.update(activeTab === "appearance" ? { preferences: appearance } : { notifications });
      }
      setFeedback({ type: "success", text: `${tab.label} settings saved successfully.` });
    } catch (error) { setFeedback({ type: "error", text: errorText(error) }); }
    finally { setSaving(false); }
  }, [saving, activeTab, profile, password, appearance, notifications, tab.label, updateUser]);

  const changeProfile = (e) => { setProfile((p) => ({ ...p, [e.target.name]: e.target.value })); clearFeedback(); };
  const changeAppearance = (e) => { const { name: key, checked, value, type } = e.target; setAppearance((p) => ({ ...p, [key]: type === "checkbox" ? checked : value })); clearFeedback(); };
  const changeNotifications = (e) => { setNotifications((p) => ({ ...p, [e.target.name]: e.target.checked })); clearFeedback(); };
  const changePassword = (e) => { setPassword((p) => ({ ...p, [e.target.name]: e.target.value })); clearFeedback(); };
  const logoutNow = () => { if (!saving && window.confirm("Sign out of SyncDoc on this device?")) logout?.(); };
  const pageMotion = reduceMotion ? {} : { initial: { opacity: 0, y: 7 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };

  return <main className="page settings-page settings-premium" aria-labelledby="settings-title">
    <motion.header className="page-heading settings-page-heading settings-hero" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32 }}>
      <div className="page-heading-content"><div className="eyebrow-row"><span className="eyebrow">WORKSPACE CONTROL</span><span className="settings-live-status"><span className="settings-live-dot" /> Account preferences</span></div><h1 id="settings-title">Settings<span className="settings-title-dot">.</span></h1><p>Your space, your workflow. Fine-tune your SyncDoc experience in one place.</p></div>
      <div className="settings-hero-art" aria-hidden="true"><div className="settings-orbit" /><div className="settings-orbit settings-orbit-two" /><div className="settings-hero-glyph"><Sparkles size={28} /></div></div>
    </motion.header>

    <AnimatePresence mode="wait">{feedback && <motion.div key={feedback.text} className={`settings-alert settings-alert-${feedback.type}`} role="status" aria-live="polite" initial={reduceMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><span>{feedback.type === "error" ? <X size={17} /> : <Check size={17} />}</span><p>{feedback.text}</p><button type="button" className="settings-alert-close" onClick={clearFeedback} aria-label="Dismiss"><X size={15} /></button></motion.div>}</AnimatePresence>

    <div className="settings-layout settings-premium-layout">
      <aside className="settings-sidebar settings-premium-sidebar">
        <div className="settings-user-card"><Avatar user={user} name={name} size="lg" /><div className="settings-user-info"><strong>{name}</strong><span>{user?.email || "Email not provided"}</span><small>{user?.role || "Member"}</small></div></div>
        <div className="settings-nav-divider" />
        <nav className="settings-nav" aria-label="Settings navigation">{TABS.map((item) => { const Icon = item.icon; const active = activeTab === item.id; return <button key={item.id} type="button" className={`settings-nav-item ${active ? "active" : ""}`} onClick={() => { if (!saving) { setActiveTab(item.id); clearFeedback(); } }} disabled={saving} aria-current={active ? "page" : undefined}><span className="settings-nav-icon"><Icon size={17} /></span><span className="settings-nav-copy"><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={15} className="settings-nav-arrow" /></button>; })}</nav>
        <div className="settings-sidebar-footer"><div className="settings-security-mini"><ShieldCheck size={18} /><div><strong>Security matters</strong><small>Keep your account up to date</small></div></div></div>
      </aside>

      <section className="settings-main" aria-labelledby="settings-section-title"><Card className="settings-card settings-premium-card">
        <div className="settings-card-header"><div><span className="settings-card-eyebrow">{tab.label.toUpperCase()} SETTINGS</span><h2 id="settings-section-title">{tab.label}</h2><p>{tab.description}</p></div><div className="settings-card-icon"><tab.icon size={21} /></div></div>
        {loading && <div className="settings-loading" role="status"><LoaderCircle className="is-spinning" size={16} /> Loading saved preferences…</div>}
        <AnimatePresence mode="wait"><motion.div key={activeTab} className="settings-content" {...pageMotion} transition={{ duration: reduceMotion ? 0 : .2 }}>
          {activeTab === "profile" && <form className="settings-section" onSubmit={handleSave}>
            <div className="settings-section-intro"><h3>Personal information</h3><p>These details help collaborators recognize you across SyncDoc.</p></div>
            <div className="settings-profile-preview"><Avatar user={user} name={profile.name || name} size="xl" /><div><strong>{profile.name || name}</strong><span>{profile.email}</span><small>Profile identity</small></div><span className="settings-profile-chip"><ShieldCheck size={13} /> Account</span></div><div className="settings-divider" />
            <div className="form-grid"><label><span>Display name</span><input name="name" value={profile.name} onChange={changeProfile} autoComplete="name" minLength={2} maxLength={50} required disabled={saving} placeholder="Your name" /><small className="field-help">2–50 characters. Visible to collaborators.</small></label><label><span>Username</span><input name="username" value={profile.username} onChange={changeProfile} autoComplete="username" minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" disabled={saving} placeholder="your_username" /><small className="field-help">Letters, numbers and underscores.</small></label><label className="form-field-full"><span>Email address</span><div className="settings-readonly-field"><Mail size={15} /><input type="email" value={profile.email} readOnly disabled /><span>Read only</span></div><small className="field-help">Contact support if you need to change your email.</small></label></div>
            <div className="settings-actions"><Button type="submit" variant="primary" loading={saving} disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save profile"}</Button></div>
          </form>}

          {activeTab === "appearance" && <form className="settings-section" onSubmit={handleSave}>
            <div className="settings-section-intro"><h3>Make it feel like yours</h3><p>Choose the visual style and motion level that fits your workflow.</p></div><div className="setting-heading"><div><strong>Color theme</strong><small>System follows your device preference.</small></div></div>
            <div className="theme-options" role="radiogroup" aria-label="Color theme">{[{ value: "system", label: "System", icon: Monitor }, { value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }].map((item) => { const Icon = item.icon; const active = appearance.theme === item.value; return <button key={item.value} type="button" role="radio" aria-checked={active} className={`theme-option ${active ? "active" : ""}`} onClick={() => setAppearance((p) => ({ ...p, theme: item.value }))}><span className="theme-option-icon"><Icon size={20} /></span><span>{item.label}</span>{active && <Check size={14} className="theme-option-check" />}</button>; })}</div><div className="settings-divider" />
            <div className="settings-options"><SettingToggle name="compactMode" checked={appearance.compactMode} onChange={changeAppearance} title="Compact layout" description="Reduce spacing to fit more content on screen." icon={LaptopIcon} /><SettingToggle name="reducedMotion" checked={appearance.reducedMotion} onChange={changeAppearance} title="Reduced motion" description="Reduce interface transitions and decorative movement." icon={Sparkles} /></div><div className="settings-actions"><Button type="submit" variant="primary" loading={saving} disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save appearance"}</Button></div>
          </form>}

          {activeTab === "notifications" && <form className="settings-section" onSubmit={handleSave}>
            <div className="settings-section-intro"><h3>Your notification signal</h3><p>Stay informed about what matters and quiet what doesn't.</p></div><div className="settings-options"><SettingToggle name="email" checked={notifications.email} onChange={changeNotifications} title="Email updates" description="Important account and product updates delivered to your inbox." icon={Mail} /><SettingToggle name="mentions" checked={notifications.mentions} onChange={changeNotifications} title="Mentions" description="When a collaborator mentions you in a discussion." icon={User} /><SettingToggle name="documentUpdates" checked={notifications.documentUpdates} onChange={changeNotifications} title="Document updates" description="Changes to documents you follow or collaborate on." icon={FileText} /><SettingToggle name="workspaceActivity" checked={notifications.workspaceActivity} onChange={changeNotifications} title="Workspace activity" description="Relevant changes across shared workspaces." icon={Users} /></div><div className="settings-actions"><Button type="submit" variant="primary" loading={saving} disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save notifications"}</Button></div>
          </form>}

          {activeTab === "security" && <form className="settings-section" onSubmit={handleSave}>
            <div className="settings-section-intro"><h3>Password & account access</h3><p>Use a unique password and never share it with anyone.</p></div><div className="security-status"><span className="security-status-icon"><ShieldCheck size={21} /></span><div><strong>Account security</strong><small>Password changes are verified by the server.</small></div><span className="security-status-badge">Protected</span></div><div className="settings-divider" />
            <div className="security-form">{[["currentPassword","Current password","current-password"],["newPassword","New password","new-password"],["confirmPassword","Confirm new password","new-password"]].map(([field,label,autocomplete]) => <PasswordField key={field} name={field} label={label} value={password[field]} onChange={changePassword} visible={!!shown[field]} onToggle={() => setShown((p) => ({ ...p, [field]: !p[field] }))} autoComplete={autocomplete} disabled={saving} />)}
              {password.newPassword && <div className="password-strength"><div className="password-strength-header"><span>Password strength</span><strong>{strength.label}</strong></div><div className="password-strength-bars">{[1,2,3,4,5,6].map((n) => <span key={n} className={n <= strength.score ? `active strength-${strength.score}` : ""} />)}</div></div>}
              {password.confirmPassword && <p className={`password-match ${password.confirmPassword === password.newPassword ? "is-match" : "is-mismatch"}`}>{password.confirmPassword === password.newPassword ? <Check size={14} /> : <X size={14} />}{password.confirmPassword === password.newPassword ? "Passwords match" : "Passwords do not match"}</p>}
            </div><div className="password-requirements"><strong>For a stronger password</strong><ul><li className={password.newPassword.length >= 8 ? "complete" : ""}><Check size={13} />At least 8 characters</li><li className={/[A-Z]/.test(password.newPassword) ? "complete" : ""}><Check size={13} />One uppercase letter</li><li className={/[0-9]/.test(password.newPassword) ? "complete" : ""}><Check size={13} />One number</li><li className={/[^A-Za-z0-9]/.test(password.newPassword) ? "complete" : ""}><Check size={13} />One special character</li></ul></div><div className="settings-actions"><Button type="submit" variant="primary" loading={saving} disabled={saving}><Lock size={15} />{saving ? "Updating…" : "Update password"}</Button></div>
            <div className="danger-zone"><div className="danger-zone-icon"><LogOut size={18} /></div><div className="danger-zone-content"><span className="eyebrow">CURRENT SESSION</span><h3>Sign out</h3><p>End your authenticated session on this device.</p></div><Button type="button" variant="danger" onClick={() => { if (!saving && window.confirm("Sign out of SyncDoc on this device?")) logout?.(); }} disabled={saving}><LogOut size={14} />Sign out</Button></div>
          </form>}
        </motion.div></AnimatePresence>
      </Card></section>
    </div>
    <p className="settings-footnote"><ShieldCheck size={14} /> Your settings are saved to your SyncDoc account when you select Save.</p>
  </main>;
}

function LaptopIcon(props) { return <Monitor {...props} />; }

function SettingToggle({ name, checked, onChange, title, description, icon: Icon }) {
  return <label className="setting-row setting-toggle"><span className="setting-row-icon"><Icon size={17} /></span><span className="setting-row-content"><strong>{title}</strong><small>{description}</small></span><span className="toggle-control"><input type="checkbox" name={name} checked={!!checked} onChange={onChange} /><span className="toggle-slider" /></span></label>;
}

function PasswordField({ name, label, value, onChange, visible, onToggle, autoComplete, disabled }) {
  return <label className="password-input-group"><span>{label}</span><div className="password-field"><Lock size={16} className="password-field-icon" /><input name={name} type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={`Enter ${label.toLowerCase()}`} autoComplete={autoComplete} disabled={disabled} minLength={8} required /><button type="button" className="password-visibility-button" onClick={onToggle} disabled={disabled} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>;
}
