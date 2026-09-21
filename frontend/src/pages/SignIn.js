import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";
import { SampleBadge } from "@/components/common";
import { FrithMark, SchoolIdentity } from "@/components/Brand";

const DEMO = [
  ["Classroom Administrator", "admin@westernpark.school"],
  ["Teacher", "teacher@westernpark.school"],
  ["Teaching Assistant", "ta@westernpark.school"],
  ["Specialist Staff", "specialist@westernpark.school"],
  ["Senior Leader", "leader@westernpark.school"],
  ["Mainstream Staff", "mainstream@westernpark.school"],
];

const PROMISES = [
  ["Predictable", "Now, Next and Later, always in the same place"],
  ["Configurable", "Nothing about your classroom is hard-coded"],
  ["Consistent", "One canonical symbol per concept, everywhere"],
  ["Spoken aloud", "Natural British voices on every card and choice"],
  ["Safe by design", "Role-based access and data minimisation"],
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
    <div className="wp-grain flex min-h-screen items-center justify-center bg-[hsl(var(--wp-surface-cream))] px-4 py-10">
      <div className="relative z-0 grid w-full max-w-5xl gap-[var(--wp-gap)] lg:grid-cols-[1.05fr_1fr] lg:items-stretch">
        <section className="wp-card flex flex-col p-8">
          <div className="flex items-start gap-4">
            <FrithMark className="h-14 w-14" />
            <div className="min-w-0">
              <h1 className="wp-display text-3xl font-bold leading-tight">
                Frith <span className="text-[hsl(var(--wp-primary))]">Classroom</span>
              </h1>
              <p className="mt-1 text-sm font-medium text-[hsl(var(--wp-ink-muted))]">
                Western Park Designated Specialist Provision
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-[hsl(var(--wp-ink-muted))]">
            A configurable digital classroom built around the shape of the day: what is happening
            now, what happens next, how to ask for what you need and how to get calm again.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            {PROMISES.map(([title, text]) => (
              <li key={title} className="flex gap-3">
                <span
                  className="mt-[0.4rem] h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--wp-primary))]"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-[hsl(var(--wp-ink))]">{title}.</strong>{" "}
                  <span className="text-[hsl(var(--wp-ink-muted))]">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* The shape of the whole product, in three rows. */}
          <div
            className="mt-7 rounded-[var(--wp-radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-sunken))] p-4"
            aria-hidden="true"
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--wp-ink-faint))]">
              Every screen answers the same question
            </p>
            <ul className="space-y-2">
              {[
                ["Now", "w-full", "opacity-100"],
                ["Next", "w-3/4", "opacity-55"],
                ["Later", "w-1/2", "opacity-30"],
              ].map(([label, width, dim]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="w-11 shrink-0 text-xs font-semibold text-[hsl(var(--wp-ink-muted))]">
                    {label}
                  </span>
                  <span className={`h-3 ${width} ${dim} rounded-full bg-[hsl(var(--wp-primary))]`} />
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto pt-8">
            <SchoolIdentity />
            <p className="mt-2 text-xs text-[hsl(var(--wp-ink-faint))]">
              <em>Frith</em> — Old English for peace, sanctuary and the protection a place gives the
              people inside it.
            </p>
          </div>
        </section>

        <section className="wp-card p-8">
          <h2 className="wp-display text-xl font-bold">Staff sign in</h2>
          <p className="mt-1 text-sm text-[hsl(var(--wp-ink-muted))]">
            Pupils never sign in. Use pupil-facing mode for the classroom display.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@westernpark.school"
                className="mt-1.5 h-12"
                data-testid="sign-in-email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-12"
                data-testid="sign-in-password"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              size="lg"
              className="w-full"
              data-testid="sign-in-submit-button"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-[var(--wp-radius-lg)] border border-[hsl(var(--wp-warning)/0.3)] bg-[hsl(var(--wp-warning-soft))] p-4">
            <div className="flex items-center gap-2">
              <SampleBadge />
              <p className="text-xs font-semibold text-[hsl(var(--wp-warning))]">
                Demonstration accounts
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--wp-ink))]">
              The password for all of these is{" "}
              <code className="rounded bg-[hsl(var(--card))] px-1 py-0.5 font-mono text-[11px] font-semibold">
                westernpark
              </code>
              . Tap one to sign in and see how permissions change what you can do.
            </p>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {DEMO.map(([role, demoEmail]) => (
                <button
                  key={demoEmail}
                  type="button"
                  onClick={(e) => submit(e, demoEmail, "westernpark")}
                  className="min-h-[44px] rounded-[var(--wp-radius-sm)] border border-[hsl(var(--wp-warning)/0.3)] bg-[hsl(var(--card))] px-3 py-2 text-left text-xs font-semibold text-[hsl(var(--wp-ink))] transition-[background-color,border-color] duration-150 hover:border-[hsl(var(--wp-primary)/0.4)] hover:bg-[hsl(var(--wp-primary-tint))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wp-focus))]"
                  data-testid={`demo-login-${role.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="mt-4 w-full gap-2"
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
