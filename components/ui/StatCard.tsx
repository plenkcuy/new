export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "up" | "down";
}) {
  return (
    <div className="card p-5">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-medium tracking-tight ${tone ?? ""}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}
