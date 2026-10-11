"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button, Card } from "@/components/ui/primitives";
export function SignIn() {
  const router = useRouter(),
    [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="secure-entry">
      <Link className="secure-wordmark" href="/">
        Sportozen <span>ACADEMY</span>
      </Link>
      <Card>
        <p className="report-kicker">ONE PLATFORM. YOUR ACADEMY.</p>
        <h1>{register ? "Create your account" : "Sign in"}</h1>
        <p>Access only the academies where you have an active membership.</p>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const result = register
                ? await authClient.signUp.email({ email, password, name })
                : await authClient.signIn.email({ email, password });
              if (result.error) {
                setError(result.error.message ?? "Check your account details.");
              } else {
                router.push("/workspace");
                router.refresh();
              }
            } catch {
              setError("Could not sign in. Please retry.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {register && (
            <label>
              Your name
              <input
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={12}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {register && (
            <p className="muted">
              Use at least 12 characters. Credentials stay in the server
              authentication system.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <Button disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </Button>
        </form>
        <Button
          variant="secondary"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "Use an existing account" : "Create an account"}
        </Button>
        <p className="muted">
          Local foundation: production email verification, account recovery and
          deployment hardening are still required before real customer use.
        </p>
      </Card>
      <Link href="/owner/dashboard">Explore the fictional browser demo</Link>
    </main>
  );
}
