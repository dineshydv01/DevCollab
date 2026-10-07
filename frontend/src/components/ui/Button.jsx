const VARIANTS = {
  primary: "bg-ink text-white hover:bg-ink/90 disabled:bg-ink/40",
  accent: "bg-accent text-accent-ink hover:bg-accent/90 disabled:bg-accent/40",
  ghost: "bg-transparent text-ink hover:bg-bg-subtle disabled:text-ink-muted",
};

export default function Button({ variant = "primary", className = "", children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
