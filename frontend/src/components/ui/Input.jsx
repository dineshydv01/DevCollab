export default function Input({ label, error, id, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-md border border-border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink ${
          error ? "border-danger focus:border-danger focus:ring-danger" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
