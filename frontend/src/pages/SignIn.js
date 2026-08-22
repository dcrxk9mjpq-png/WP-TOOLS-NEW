import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";
import { Mascot, SampleBadge } from "@/components/common";

const DEMO = [
  ["Classroom Administrator", "admin@westernpark.school"],
  ["Teacher", "teacher@westernpark.school"],
  ["Teaching Assistant", "ta@westernpark.school"],
  ["Specialist Staff", "specialist@westernpark.school"],
  ["Senior Leader", "leader@westernpark.school"],
  ["Mainstream Staff", "mainstream@westernpark.school"],
];

export default function SignIn() {
  const { signIn } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e, overrideEmail, overridePassword) => {
    e?.preventDefault?.();
    const useEmail = overrideEmail || email;
    const usePassword = overridePassword || password;
    if (!useEmail || !usePassword) {
      toast.error("Enter your email and password");
      return;
    }
    setBusy(true);
    try {
      const user = await signIn(useEmail, usePassword);
      toast.success(`Welcome back, ${user.name}`);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Could not sign in"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--wp-surface-cream))] px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
        <section className="wp-card relative overflow-hidden p-8">
          <div className="wp-noise pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <Mascot className="h-14 w-14" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--wp-ink-muted))]">
                  Braunstone Frith Primary Academy
                </p>
                <h1 className="wp-display text-2xl font-bold leading-tight sm:text-3xl">
                  Western Park Classroom Platform
                </h1>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
              A configurable digital classroom for the Western Park Designated Specialist Provision.
              Built around the classroom day, communication, interaction and regulation — with one
              consistent symbol for every concept.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                ["Predictable", "Now, Next and Later, always in the same place"],
                ["Configurable", "Nothing about your classroom is hard-coded"],
                ["Consistent", "One canonical symbol per concept, everywhere"],
                ["Safe by design", "Role-based access and data minimisation"],
              ].map(([title, text]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--wp-teal))]" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold">{title}.</strong>{" "}
                    <span className="text-[hsl(var(--wp-ink-muted))]">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="wp-card p-8">
          <h2 className="wp-display text-xl font-bold">Staff sign in</h2>
          <p className="mt-1 text-sm text-[hsl(var(--wp-ink-muted))]">
            Pupils never sign in. Use pupil-facing mode for the classroom display.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@westernpark.school"
                className="mt-1.5 h-11"
                data-testid="sign-in-email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11"
                data-testid="sign-in-password"
              />
            </div>
            <Button type="submit" disabled={busy} className="h-12 w-full text-base" data-testid="sign-in-submit-button">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-[var(--wp-radius-lg)] border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <SampleBadge />
              <p className="text-xs font-semibold text-amber-900">Prototype accounts</p>
            </div>
            <p className="mt-2 text-xs text-amber-900">
              Password for all of these is <code className="font-semibold">westernpark</code>. Tap one to
              sign in and see how permissions change what you can do.
            </p>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {DEMO.map(([role, demoEmail]) => (
                <button
                  key={demoEmail}
                  type="button"
                  onClick={(e) => submit(e, demoEmail, "westernpark")}
                  className="rounded-[var(--wp-radius-sm)] border border-amber-200 bg-white px-3 py-2 text-left text-xs font-medium transition-colors duration-200 hover:bg-[hsl(var(--wp-tint-butter))]"
                  data-testid={`demo-login-${role.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-4 h-12 w-full gap-2"
            onClick={(e) => submit(e, "display@westernpark.school", "westernpark")}
            data-testid="start-pupil-facing-mode"
          >
            <Monitor className="h-4 w-4" aria-hidden="true" />
            Start pupil-facing mode
          </Button>
        </section>
      </div>
    </div>
  );
}
