"use client";

import { useState } from "react";
import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Portofolio", icon: Briefcase },
  { label: "Analisis", icon: BarChart3 },
  { label: "Pasar", icon: LineChart },
  { label: "Komunitas", icon: Users },
];

const FOOTER_NAV = [
  { label: "Pengaturan", icon: Settings },
  { label: "Bantuan", icon: LifeBuoy },
];

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="6" fill="#2dd4bf" />
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
              stroke="#2dd4bf"
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

type SidebarProps = {
  /** Hanya berpengaruh di layar kecil (drawer). Di desktop sidebar selalu tampil. */
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const [active, setActive] = useState("Dashboard");

  const select = (label: string) => {
    setActive(label);
    onClose();
  };

  const item = ({ label, icon: Icon }: { label: string; icon: LucideIcon }) => (
    <button key={label} type="button" className="nav-item" data-active={active === label} onClick={() => select(label)}>
      <Icon size={20} strokeWidth={1.6} />
      {label}
    </button>
  );

  return (
    <aside
      aria-label="Navigasi utama"
      className={[
        "card fixed inset-y-3 left-3 z-50 flex w-[280px] max-w-[85vw] flex-col p-4",
        "transition-[transform,visibility] duration-300 ease-out",
        open ? "visible translate-x-0" : "invisible -translate-x-[115%]",
        "lg:visible lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-3 pb-8 pt-4">
        <Brand />
        <button type="button" className="icon-btn h-10! w-10! lg:hidden" aria-label="Tutup menu" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <nav className="flex flex-col gap-2">{NAV.map(item)}</nav>

      <div className="mt-auto flex flex-col gap-1 pb-2 pt-6">{FOOTER_NAV.map(item)}</div>
    </aside>
  );
}
