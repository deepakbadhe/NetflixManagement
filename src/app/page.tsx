import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="wrap">
      <div className="topbar">
        <span className="who">
          Signed in as&nbsp;<b style={{ color: "#fff" }}>{user.email}</b>
          <span className={`badge ${user.role === "admin" ? "badge-admin" : "badge-user"}`}>{user.role}</span>
        </span>
        <LogoutButton />
      </div>

      <header className="app-header">
        <p className="eyebrow">Netflix Management</p>
        <h1 className="brand">Dashboard</h1>
        <p className="sub">Fetch a sign-in code or password reset link</p>
        <div className="divider" />
      </header>

      <div className="card">
        <div className="tiles">
          <Link className="tile" href="/tools/sign-code">
            <span className="tile-icon">🔑</span>
            <h3>Get Sign-in Code</h3>
            <p>Latest Netflix sign-in code from the last 2 hours.</p>
          </Link>
          <Link className="tile" href="/tools/reset-link">
            <span className="tile-icon">🔗</span>
            <h3>Reset Link</h3>
            <p>Netflix password / sign-in link from the last 24 hours.</p>
          </Link>
        </div>

        {user.role === "admin" && (
          <div style={{ marginTop: 14 }}>
            <Link className="tile" href="/admin" style={{ display: "block" }}>
              <span className="tile-icon">👤</span>
              <h3>Admin · Manage Users</h3>
              <p>Create accounts (username = email), reset passwords, remove users.</p>
            </Link>
          </div>
        )}
      </div>

      <div className="footer">Netflix Management</div>
    </div>
  );
}
