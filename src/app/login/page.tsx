import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="wrap wrap-narrow">
      <header className="app-header">
        <p className="eyebrow">Netflix Management</p>
        <h1 className="brand">Sign In</h1>
        <div className="divider" />
      </header>
      <LoginForm />
      <div className="footer">Netflix Management</div>
    </div>
  );
}
