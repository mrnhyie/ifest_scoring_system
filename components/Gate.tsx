"use client";

import { useRef, useState, type FormEvent } from "react";

type Props = {
  mode: "setup" | "login";
  onSubmit: (password: string) => Promise<void>;
};

export default function Gate({ mode, onSubmit }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const setup = mode === "setup";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!password) {
      setError("Please enter the password key.");
      return;
    }
    if (setup && password.length < 6) {
      setError("Password key needs at least 6 characters.");
      return;
    }
    if (setup && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid password. Try again.");
      setBusy(false);
      if (!setup) {
        setPassword("");
        passwordRef.current?.focus();
      }
    }
  }

  const buttonLabel = busy
    ? setup
      ? "Saving key…"
      : "Authenticating…"
    : setup
      ? "Save Access Key"
      : "Unlock Scoreboard";

  return (
    <div className="gate" id="gateView">
      <div className="gate-card">
        <div className="gate-brand">
          <span className="brand-dot" aria-hidden="true" />
          <span>Scoreboard</span>
        </div>

        <form id={setup ? "setupPane" : "loginPane"} onSubmit={submit} noValidate>
          <span className="gate-eyebrow">{setup ? "First run setup" : "Admin access"}</span>
          <h2>{setup ? "Set Admin Key" : "Enter Admin Key"}</h2>
          <p className="gate-sub">
            {setup
              ? "Set a password string to secure scoring controls. You can also set ADMIN_PASSWORD in environment variables."
              : "Enter the admin password key to unlock scoreboard controls."}
          </p>

          <label className="gate-field">
            <span>{setup ? "Password Key" : "Admin Password"}</span>
            <input
              id={setup ? "newPass" : "loginPass"}
              ref={passwordRef}
              type="password"
              autoComplete={setup ? "new-password" : "current-password"}
              placeholder="••••••••••••"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {setup && (
            <label className="gate-field">
              <span>Confirm Password Key</span>
              <input
                id="newPass2"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}

          <p className="gate-error" id={setup ? "setupError" : "loginError"} role="alert" hidden={!error}>
            {error}
          </p>

          <button className="gate-btn" type="submit" disabled={busy}>
            {buttonLabel}
          </button>
          <div className="gate-links">
            <a href="/view" target="_blank" rel="noopener">
              Open Public Viewer &rarr;
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
