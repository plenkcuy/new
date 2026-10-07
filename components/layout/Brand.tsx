export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="6" fill="#2dd4bf" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={(16 + Math.cos(a) * 10).toFixed(2)}
              y1={(16 + Math.sin(a) * 10).toFixed(2)}
              x2={(16 + Math.cos(a) * 14).toFixed(2)}
              y2={(16 + Math.sin(a) * 14).toFixed(2)}
              stroke="#2dd4bf"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <span className={`text-xl font-medium tracking-tight ${compact ? "hidden sm:inline" : ""}`}>Lumen Invest</span>
    </div>
  );
}
