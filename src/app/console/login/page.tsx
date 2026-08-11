import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { LoginForm } from "@/admin/screens/login/LoginForm";

export const metadata: Metadata = {
  title: "Sign In · CTR Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) {
    redirect("/admin");
  }

  return <LoginForm />;
}
