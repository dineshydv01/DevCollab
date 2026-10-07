import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Link to="/" className="font-display text-xl font-semibold">
          DevCollab
        </Link>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Build better teams.
            <br />
            Build better projects.
          </h1>
          <p className="mt-4 max-w-sm text-white/70">
            Find developers with the skills you need, matched by a real scoring algorithm — not a
            random list.
          </p>
        </div>
        <p className="font-mono text-xs text-white/40">devcollab.dev</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold text-ink">Create your account</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Already have one?{" "}
            <Link to="/login" className="font-medium text-link hover:underline">
              Log in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Input
              id="fullName"
              name="fullName"
              label="Full name"
              value={form.fullName}
              onChange={handleChange}
              required
              minLength={2}
            />
            <Input
              id="username"
              name="username"
              label="Username"
              value={form.username}
              onChange={handleChange}
              required
              minLength={3}
              pattern="[a-z0-9_]+"
              title="Lowercase letters, numbers, and underscores only"
            />
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" variant="accent" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
