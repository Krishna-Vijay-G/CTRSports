import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { LoginForm } from "../_components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) {
    redirect("/media/admin");
  }

  return <LoginForm />;
}
