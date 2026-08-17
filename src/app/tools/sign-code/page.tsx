import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ToolClient from "@/components/ToolClient";

export const dynamic = "force-dynamic";

export default async function SignCodePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="wrap">
      <div className="topbar">
        <Link className="back-link" href="/">← Dashboard</Link>
      </div>
      <header className="app-header">
        <p className="eyebrow">Netflix Management</p>
        <h1 className="brand">Get Sign Code</h1>
        <p className="sub">Fetch the latest Netflix sign-in code</p>
        <div className="divider" />
      </header>
      <ToolClient kind="code" isAdmin={user.role === "admin"} lockedEmail={user.email} />
      <div className="footer">Netflix Management</div>
    </div>
  );
}
