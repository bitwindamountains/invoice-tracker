"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export type AuthMode = "login" | "register" | "forgot" | "reset" | "verify";
const copy = {
  login: {
    title: "Welcome back.",
    description: "Sign in to your payment collection workspace.",
    action: "Sign in",
  },
  register: {
    title: "Make room for good work.",
    description: "Start with your account. Your workspace follows.",
    action: "Create account",
  },
  forgot: {
    title: "Let’s get you back in.",
    description: "We’ll send a link to reset your password.",
    action: "Send reset link",
  },
  reset: {
    title: "A fresh start.",
    description: "Choose a new password for your account.",
    action: "Reset password",
  },
  verify: {
    title: "Check your inbox.",
    description: "Verify your email before signing in. Need a new link?",
    action: "Resend verification email",
  },
};

export function AuthForm({
  mode,
  token,
  invalidLink,
}: {
  mode: AuthMode;
  token?: string;
  invalidLink?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const content = copy[mode];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    if (
      (mode === "register" || mode === "reset") &&
      password !== values.get("confirmPassword")
    ) {
      setError("Your passwords don’t match.");
      return;
    }
    setPending(true);
    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({
          email,
          password,
          rememberMe: values.get("remember") === "on",
        });
        if (result.error) {
          setError(result.error.message ?? "Sign in failed.");
          return;
        }
        router.replace("/app");
        router.refresh();
      } else if (mode === "register") {
        const result = await authClient.signUp.email({
          name: String(values.get("name")).trim(),
          email,
          password,
          callbackURL: "/login",
        });
        if (result.error) {
          setError(result.error.message ?? "Account creation failed.");
          return;
        }
        setMessage(
          "Check your inbox for a verification link. If you already have an account, sign in or reset your password.",
        );
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        if (result.error) {
          setError(
            "We couldn’t request a reset link. Please try again shortly.",
          );
          return;
        }
        setMessage(
          "If an account exists for this email, a reset link will arrive shortly.",
        );
      } else if (mode === "verify") {
        const result = await authClient.sendVerificationEmail({
          email,
          callbackURL: "/login",
        });
        if (result.error) {
          setError(
            "We couldn’t request a verification link. Please try again shortly.",
          );
          return;
        }
        setMessage(
          "If your account needs verification, you’ll receive a new link shortly.",
        );
      } else {
        const result = await authClient.resetPassword({
          token,
          newPassword: password,
        });
        if (result.error) {
          setError(
            result.error.message ?? "This reset link is invalid or expired.",
          );
          return;
        }
        setMessage(
          "Password updated. You can now sign in with your new password.",
        );
      }
    } catch {
      setError("We couldn’t connect. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <span className="eyebrow">YOUR NEXT CHAPTER</span>
      <h1>{content.title}</h1>
      <p className="form-description">{content.description}</p>
      {invalidLink && (
        <p className="notice error" role="alert">
          This link is invalid or expired. Request a new one to continue.
        </p>
      )}
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && (
          <label>
            Full name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Alex Rivera"
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@yourbusiness.com"
            />
          </label>
        )}
        {(mode === "login" || mode === "register" || mode === "reset") && (
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
            />
            {mode !== "login" && (
              <span className="field-hint">Use at least 12 characters.</span>
            )}
          </label>
        )}
        {(mode === "register" || mode === "reset") && (
          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
        )}
        {mode === "login" && (
          <div className="form-options">
            <label className="checkbox">
              <input type="checkbox" name="remember" />
              Remember me
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice success" role="status">
            {message}
          </p>
        )}
        <button
          className="button primary full"
          disabled={pending || (mode === "reset" && (!token || invalidLink))}
        >
          {pending ? "Please wait…" : content.action}
          <ArrowRight size={18} />
        </button>
      </form>
      <div className="auth-switch">
        {mode === "login" ? (
          <>
            New here? <Link href="/register">Create an account</Link>
            <br />
            <Link className="resend" href="/verify-email">
              Resend verification email
            </Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login">Sign in</Link>
          </>
        )}
      </div>
      {mode === "reset" && (
        <Link className="resend" href="/forgot-password">
          Request a new reset link
        </Link>
      )}
    </>
  );
}
