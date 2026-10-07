export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    // `lg:pr-80` menyisakan ruang untuk menu pengguna yang melayang di kanan atas (lihat AppShell).
    <div className="flex flex-wrap items-end justify-between gap-4 lg:pr-80">
      <div>
        <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
