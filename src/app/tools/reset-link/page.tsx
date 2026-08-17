import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ToolClient from "@/components/ToolClient";

export const dynamic = "force-dynamic";

export default async function ResetLinkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="wrap">
      <div className="topbar">
        <Link className="back-link" href="/">← Dashboard</Link>
      </div>
      <header className="app-header">
        <p className="eyebrow">Netflix Management</p>
        <h1 className="brand">Reset Link</h1>
        <p className="sub">Fetch the Netflix password / sign-in link</p>
        <div className="divider" />
      </header>
      <ToolClient kind="link" isAdmin={user.role === "admin"} lockedEmail={user.email} />
      <div className="footer">Netflix Management</div>
    </div>
  );
}
