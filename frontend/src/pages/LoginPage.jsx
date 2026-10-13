import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { GithubIcon, GoogleIcon } from "../components/ui/Icons.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Named "identifier" here since it can be either an email or a
  // username (see auth.validator.js's loginSchema for why the
  // backend still calls the underlying field "email").
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const paramError = searchParams.get("error");
    if (paramError) {
      setError(decodeURIComponent(paramError));
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(identifier, password);
      const redirectTo = location.state?.from || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Link to="/" className="font-display text-xl font-semibold">
          DevCollab
        </Link>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight">Welcome back.</h1>
          <p className="mt-4 max-w-sm text-white/70">
            Your projects, your team, and your next collaboration are waiting.
          </p>
        </div>
        <p className="font-mono text-xs text-white/40">devcollab.dev</p>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold text-ink">Log in</h2>
          <p className="mt-2 text-sm text-ink-muted">
            New here?{" "}
            <Link to="/register" className="font-medium text-link hover:underline">
              Create an account
            </Link>
          </p>

          {/* OAuth Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href="/api/auth/github"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-white py-2.5 px-4 text-xs font-semibold text-ink shadow-2xs hover:bg-bg-subtle transition-colors"
            >
              <GithubIcon className="h-4 w-4" />
              Continue with GitHub
            </a>
            <a
              href="/api/auth/google"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-white py-2.5 px-4 text-xs font-semibold text-ink shadow-2xs hover:bg-bg-subtle transition-colors"
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </a>
          </div>

          <div className="relative my-6 text-center text-xs text-ink-muted">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-white px-2 uppercase font-mono text-[10px]">
              or with credentials
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="identifier"
              type="text"
              label="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-danger">
                {error}
              </div>
            )}

            <Button type="submit" variant="accent" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
