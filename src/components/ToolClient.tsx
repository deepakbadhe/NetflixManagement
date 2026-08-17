"use client";

import { useState } from "react";

type Props = { kind: "code" | "link"; isAdmin: boolean; lockedEmail: string };

export default function ToolClient({ kind, isAdmin, lockedEmail }: Props) {
  const [email, setEmail] = useState(isAdmin ? "" : lockedEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; value: string } | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const endpoint = kind === "code" ? "/api/tools/sign-code" : "/api/tools/reset-link";
  const actionLabel = kind === "code" ? "Get Sign-in Code" : "Get Reset Link";
  const windowLabel = kind === "code" ? "last 2 hours" : "last 24 hours";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setNotFound(null);
    setCopied(false);
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isAdmin ? { email } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (!data.found) {
        setNotFound(data.email || email);
        return;
      }
      setResult({ email: data.email, value: kind === "code" ? data.code : data.link });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(v: string) {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="card">
        <div className="info-panel">
          {isAdmin ? (
            <>
              Enter <b>one email address</b> to fetch its Netflix{" "}
              {kind === "code" ? "sign-in code" : "reset link"} from the {windowLabel}.
            </>
          ) : (
            <>
              This fetches the Netflix {kind === "code" ? "sign-in code" : "reset link"} for{" "}
              <b>your account email</b> from the {windowLabel}.
            </>
          )}
        </div>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="form-label">Email</label>
            {isAdmin ? (
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="account@email.com"
                required
                autoFocus
              />
            ) : (
              <div className="locked-email">
                <span className="lock">🔒</span>
                <span>{lockedEmail}</span>
              </div>
            )}
          </div>
          <button type="submit" className="btn-nf" disabled={loading}>
            {loading ? "Searching…" : actionLabel}
          </button>
        </form>

        {loading && (
          <div className="loader">
            <div className="spinner" />
          </div>
        )}
      </div>

      {result && kind === "code" && (
        <div className="card">
          <div className="result-head">Sign-in code found</div>
          <ul className="code-list">
            <li className="code-row">
              <span className="code-email">{result.email}</span>
              <span className="code-value">{result.value}</span>
              <button
                type="button"
                className={`copy-btn ${copied ? "copied" : ""}`}
                onClick={() => copy(result.value)}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </li>
          </ul>
        </div>
      )}

      {result && kind === "link" && (
        <div className="card">
          <div className="result-head">Reset link found</div>
          <ul className="link-list">
            <li className="link-row">
              <div className="link-info">
                <span className="link-email">{result.email}</span>
                <a
                  className="link-url"
                  href={result.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={result.value}
                >
                  {result.value}
                </a>
              </div>
              <div className="link-actions">
                <a className="open-btn" href={result.value} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
                <button
                  type="button"
                  className={`copy-btn ${copied ? "copied" : ""}`}
                  onClick={() => copy(result.value)}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </li>
          </ul>
        </div>
      )}

      {error && (
        <div className="card">
          <div className="notice notice-error">{error}</div>
        </div>
      )}

      {notFound && (
        <div className="card">
          <div className="notice notice-warn">
            <strong>No {kind === "code" ? "sign-in code" : "reset link"} found.</strong>
            <span>
              No matching Netflix email for <b>{notFound}</b> in the {windowLabel}. Make sure it was
              requested, then try again.
            </span>
          </div>
        </div>
      )}
    </>
  );
}
