import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Settings,
  Users,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Portofolio", icon: Briefcase },
  { label: "Analisis", icon: BarChart3 },
  { label: "Pasar", icon: LineChart },
  { label: "Komunitas", icon: Users },
];

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="6" fill="#c892bb" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          const x1 = 16 + Math.cos(a) * 10;
          const y1 = 16 + Math.sin(a) * 10;
          const x2 = 16 + Math.cos(a) * 14;
          const y2 = 16 + Math.sin(a) * 14;
          return (
            <line
              key={i}
              x1={x1.toFixed(2)}
              y1={y1.toFixed(2)}
              x2={x2.toFixed(2)}
              y2={y2.toFixed(2)}
              stroke="#c892bb"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <span className="text-xl font-medium tracking-tight">Lumen Invest</span>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="card hidden h-full flex-col p-4 lg:flex">
      <div className="px-3 pb-8 pt-4">
        <Brand />
      </div>

      <nav className="flex flex-col gap-2">
        {NAV.map(({ label, icon: Icon, active }) => (
          <a key={label} href="#" className="nav-item" data-active={!!active}>
            <Icon size={20} strokeWidth={1.6} />
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pb-2">
        <a href="#" className="nav-item">
          <Settings size={20} strokeWidth={1.6} />
          Pengaturan
        </a>
        <a href="#" className="nav-item">
          <LifeBuoy size={20} strokeWidth={1.6} />
          Bantuan
        </a>
      </div>
    </aside>
  );
}
