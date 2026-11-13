"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";

import { authClient, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = { kind: "ok" | "error"; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role="status" className={status.kind === "ok" ? "text-sm text-signal" : "text-sm text-destructive"}>
      {status.text}
    </p>
  );
}

export function ProfileForms({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [pwStatus, setPwStatus] = useState<Status>(null);
  const [sessStatus, setSessStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<"name" | "pw" | "out" | "others" | null>(null);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setBusy("name");
    setNameStatus(null);
    const { error } = await authClient.updateUser({ name: displayName.trim() });
    setBusy(null);
    if (error) setNameStatus({ kind: "error", text: error.message ?? "Couldn't save the name." });
    else {
      setNameStatus({ kind: "ok", text: "Saved." });
      router.refresh();
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("current") ?? "");
    const next = String(data.get("next") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (next.length < 10) return setPwStatus({ kind: "error", text: "The new password needs at least 10 characters." });
    if (next !== confirm) return setPwStatus({ kind: "error", text: "The two new passwords don't match." });
    setBusy("pw");
    setPwStatus(null);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setBusy(null);
    if (error) setPwStatus({ kind: "error", text: error.message ?? "Couldn't change the password." });
    else {
      form.reset();
      setPwStatus({ kind: "ok", text: "Password changed. Other devices have been signed out." });
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal">Account</CardTitle>
          <CardDescription>The name shown in the sidebar. Your email is your sign-in and can’t be changed here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="grid gap-4 md:max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={80} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={busy !== null || displayName.trim() === name}>
                {busy === "name" ? "Saving…" : "Save"}
              </Button>
              <StatusLine status={nameStatus} />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal">Password</CardTitle>
          <CardDescription>At least 10 characters. Changing it signs you out everywhere else.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid gap-4 md:max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="next">New password</Label>
              <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Repeat new password</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={busy !== null}>
                {busy === "pw" ? "Changing…" : "Change password"}
              </Button>
              <StatusLine status={pwStatus} />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal">Sessions</CardTitle>
          <CardDescription>Sign out here, or on every other phone and computer you’ve used.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("others");
              await authClient.revokeOtherSessions();
              setBusy(null);
              setSessStatus({ kind: "ok", text: "Other devices signed out." });
            }}
          >
            {busy === "others" ? "Signing out…" : "Sign out other devices"}
          </Button>
          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("out");
              await signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut /> Sign out
          </Button>
          <StatusLine status={sessStatus} />
        </CardContent>
      </Card>
    </div>
  );
}
