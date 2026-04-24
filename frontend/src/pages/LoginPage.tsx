import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

function generateCaptcha(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  }, []);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (captchaInput !== captcha) {
      toast.error("Invalid captcha. Please try again.");
      refreshCaptcha();
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
      toast.success(t("toast_welcome_back"));
      nav("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vjti-auth-page">
      {/* Scrolling Ticker */}
      {/* <div className="vjti-ticker">
        <div className="vjti-ticker-content">
          <span>📢 Welcome to VJTI Complaint Management System — Report issues, track resolutions, and help improve campus life.&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;🔧 Maintenance requests are processed Monday to Saturday, 9:00 AM to 5:00 PM.&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;📋 New users: Please sign up with your official VJTI email address.</span>
        </div>
      </div> */}

      <div className="vjti-auth-container">
        {/* Left Panel - Gate Image */}
        <div className="vjti-auth-image-panel">
          <img
            src="/assets/vjti-gate.png"
            alt="VJTI Gate Entrance"
            className="vjti-auth-gate-img"
          />
        </div>

        {/* Right Panel - Login Form */}
        <div className="vjti-auth-form-panel">
          <div className="vjti-auth-form-inner">
            {/* Logo */}
            <div className="vjti-logo-section">
              <img
                src="/assets/vjti-logo.png"
                alt="Veermata Jijabai Technological Institute"
                className="vjti-logo-img"
              
              />
            </div>

            {/* Sign In Heading */}
            <h1 className="vjti-auth-heading">{t("login")}</h1>

            <form onSubmit={onSubmit} className="vjti-auth-form">
              {/* User Name Field */}
              <div className="vjti-field-group">
                <label className="vjti-field-label">{t("email_official")}</label>
                <div className="vjti-input-wrapper">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="vjti-input"
                    placeholder="User Name"
                  />
                  <span className="vjti-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                </div>
              </div>

              {/* Password Field */}
              <div className="vjti-field-group">
                <label className="vjti-field-label">{t("password")}</label>
                <div className="vjti-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="vjti-input"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    className="vjti-input-icon vjti-input-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div className="vjti-captcha-row">
                <div className="vjti-captcha-display">
                  <button
                    type="button"
                    className="vjti-captcha-refresh"
                    onClick={refreshCaptcha}
                    title="Refresh Captcha"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </button>
                  <span className="vjti-captcha-text">{captcha}</span>
                </div>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="vjti-captcha-input"
                  placeholder="Captcha"
                  required
                  maxLength={4}
                />
              </div>

              {/* Remember Me */}
              <div className="vjti-remember-row">
                <label className="vjti-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="vjti-checkbox"
                  />
                  <span>Remember Me</span>
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                className="vjti-submit-btn"
                disabled={busy}
              >
                {busy ? t("signing_in") : t("sign_in")}
              </button>

              {/* Forgot Password */}
              <div className="vjti-forgot-row">
                <a href="#" className="vjti-forgot-link">
                  Forgot Password / UserName
                </a>
              </div>
            </form>

            {/* Signup Link */}
            <p className="vjti-switch-auth">
              {t("no_account")}{" "}
              <Link className="vjti-switch-link" to="/signup">
                {t("signup")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
