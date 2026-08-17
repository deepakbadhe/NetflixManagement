import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import AdminClient from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const users = await listUsers();

  return (
    <div className="wrap">
      <div className="topbar">
        <Link className="back-link" href="/">← Dashboard</Link>
      </div>
      <header className="app-header">
        <p className="eyebrow">Netflix Management</p>
        <h1 className="brand">Manage Users</h1>
        <p className="sub">Create accounts and control who can look up which email</p>
        <div className="divider" />
      </header>
      <AdminClient
        initialUsers={users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          created_at: String(u.created_at),
        }))}
        currentUserId={user.id}
      />
      <div className="footer">Netflix Management</div>
    </div>
  );
}
