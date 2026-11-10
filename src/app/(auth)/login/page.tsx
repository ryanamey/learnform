import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");
  const allowSignup = process.env.ALLOW_SIGNUP === "true";
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl tracking-tight">Learn Form</h1>
          <p className="mt-2 text-sm text-muted-foreground">A private studio for learning form — and using it.</p>
        </div>
        <LoginForm allowSignup={allowSignup} />
      </div>
    </div>
  );
}
