"use client";

import { useState } from "react";

type U = { id: number; email: string; role: "admin" | "user"; created_at: string };
type Msg = { type: "error" | "success"; text: string };

export default function AdminClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: U[];
  currentUserId: number;
}) {
  const [users, setUsers] = useState<U[]>(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: d.error || "Could not create user." });
      } else {
        setMsg({ type: "success", text: `Created ${d.user.email}.` });
        setEmail("");
        setPassword("");
        setRole("user");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(u: U) {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id }),
    });
    const d = await res.json();
    if (!res.ok) setMsg({ type: "error", text: d.error || "Could not delete user." });
    else {
      setMsg({ type: "success", text: `Deleted ${u.email}.` });
      await refresh();
    }
  }

  async function resetPw(u: U) {
    const pw = prompt(`New password for ${u.email} (min 6 characters):`);
    if (!pw) return;
    const res = await fetch("/api/admin/users/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, password: pw }),
    });
    const d = await res.json();
    if (!res.ok) setMsg({ type: "error", text: d.error || "Could not update password." });
    else setMsg({ type: "success", text: `Password updated for ${u.email}.` });
  }

  return (
    <>
      <div className="card">
        <p className="section-title">Create user</p>
        <form onSubmit={createUser}>
          <div className="row-inline">
            <div className="field">
              <label className="form-label">Email (username)</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="account@email.com"
                required
              />
            </div>
            <div className="field">
              <label className="form-label">Password</label>
              <input
                type="text"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min 6 characters"
                required
              />
            </div>
            <div className="field" style={{ maxWidth: 150 }}>
              <label className="form-label">Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {msg && (
            <div className={`notice notice-${msg.type}`} style={{ marginTop: 16 }}>
              {msg.text}
            </div>
          )}
          <button className="btn-nf" disabled={busy}>
            {busy ? "Creating…" : "Create user"}
          </button>
        </form>
      </div>

      <div className="card">
        <p className="section-title">Users ({users.length})</p>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="email">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-admin" : "badge-user"}`}>{u.role}</span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="mini-btn" onClick={() => resetPw(u)} type="button">
                        Reset password
                      </button>
                      {u.id !== currentUserId && (
                        <button className="mini-btn danger" onClick={() => remove(u)} type="button">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted)" }}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
