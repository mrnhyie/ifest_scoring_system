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

    if (!password) return;
    if (setup && password.length < 6) {
      setError("Password needs at least 6 characters.");
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
      setError(err instanceof Error ? err.message : "Wrong password.");
      setBusy(false);
      if (!setup) {
        setPassword("");
        passwordRef.current?.focus();
      }
    }
  }

  const buttonLabel = busy
    ? (setup ? "Setting password…" : "Signing in…")
    : (setup ? "Set admin password" : "Sign in");

  return (
    <div className="gate" id="gateView">
      <div className="gate-card">
        <div className="gate-brand">
          <span className="brand-dot" aria-hidden="true" />
          Scoreboard
        </div>

        <form id={setup ? "setupPane" : "loginPane"} onSubmit={submit} noValidate>
          <span className="gate-eyebrow">{setup ? "First run" : "Admin"}</span>
          <h2>{setup ? "Set admin password" : "Sign in to score"}</h2>
          <p className="gate-sub">
            {setup
              ? "Set a password to guard scoring. You can also configure ADMIN_PASSWORD in environment variables."
              : "Only the admin controls the scoreboard. The viewer page stays open to the audience."}
          </p>

          <label className="gate-field">
            <span>Password</span>
            <input
              id={setup ? "newPass" : "loginPass"}
              ref={passwordRef}
              type="password"
              autoComplete={setup ? "new-password" : "current-password"}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {setup && (
            <label className="gate-field">
              <span>Confirm password</span>
              <input
                id="newPass2"
                type="password"
                autoComplete="new-password"
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
              Viewer page
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
