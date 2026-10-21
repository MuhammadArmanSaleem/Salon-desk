import Link from "next/link";
import LoginForm from "@/components/login-form";
import { configured } from "@/lib/supabase/server";
export default function Login() {
  return (
    <main className="loginpage">
      <Link className="musklogo" href="/">
        MUSK<span>BY LUBNA ARIF</span>
      </Link>
      <section className="logincard">
        <span className="eyebrow">THE MANAGEMENT STUDIO</span>
        <h1>Welcome back.</h1>
        <p className="subtitle">Sign in to manage your salon day.</p>
        <LoginForm enabled={configured()} />
        <Link className="backlink" href="/">
          ← Back to the salon
        </Link>
      </section>
      <p className="loginfine">
        Staff access only · Owner, receptionist and stylist
      </p>
    </main>
  );
}
