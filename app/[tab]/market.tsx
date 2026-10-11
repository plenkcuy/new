import Link from "next/link";
import { Lock } from "lucide-react";
import { AssetIcon } from "@/components/asset-icon";
import { PageHeader } from "@/components/ui";
import { MARKET_MAX_AGE_MS, deniedRedirect, limitsFor } from "@/lib/access";
import { getMarketPage } from "@/lib/market-lists";
import {
  LIST_DEFS,
  MARKETS,
  MARKET_COLOR,
  MARKET_LABEL,
  isMarket,
  pct,
  unitPrice,
  type ScreenProps,
} from "@/lib/shared";

const clock = (ms: number) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(ms);

export async function MarketScreen({ user, query }: ScreenProps) {
  const { marketFeed } = limitsFor(user.tier);

  const market = isMarket(query.market) ? query.market : "idx";
  const defs = LIST_DEFS[market];
  const def = defs.find((d) => d.key === query.list) ?? defs[0];
  const href = (m: string, list?: string) => `/market?market=${m}${list ? `&list=${list}` : ""}`;

  const header = (
    <PageHeader title="Pasar" subtitle="Saham IDX, saham US, dan crypto yang sedang ramai">
      {marketFeed !== "realtime" && (
        <Link href={deniedRedirect("premium", "/market")} className="pill text-[var(--muted)]">
          <Lock size={12} /> Pembaruan lebih cepat khusus Premium
        </Link>
      )}
    </PageHeader>
  );

  if (!process.env.DATABASE_URL) {
    return (
      <>
        {header}
        <section className="card p-6 text-sm leading-relaxed text-[var(--muted)]">
          Database belum terhubung. Isi <code className="text-[var(--accent)]">DATABASE_URL</code> dengan connection string Neon,
          lalu jalankan <code className="text-[var(--accent)]">db/001_journal.sql</code> sekali di Neon.
        </section>
      </>
    );
  }

  const page = await getMarketPage(market, def, MARKET_MAX_AGE_MS[marketFeed]);
  const showCap = page.items.some((i) => i.capLabel);
  const show7d = page.items.some((i) => i.change7d !== null);

  return (
    <>
      {header}

      <div className="flex flex-wrap items-center gap-2">
        {MARKETS.map((m) => (
          <Link key={m} href={href(m)} className="pill" data-active={market === m}>
            {MARKET_LABEL[m]}
          </Link>
        ))}
        {page.updatedAt && <span className="ml-auto text-[11px] text-[var(--muted)]">Diperbarui {clock(page.updatedAt)} WIB</span>}
      </div>

      {page.overview.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {page.overview.slice(0, 8).map((o) => (
            <div key={`${o.group}${o.name}`} className="card p-5">
              <div className="text-xs text-[var(--muted)]">{o.group ? `${o.group} · ${o.name}` : o.name}</div>
              <div className="mt-2 text-2xl font-medium tracking-tight">{o.value}</div>
              {o.changePct !== null && <div className={`mt-1 text-xs ${o.changePct >= 0 ? "up" : "down"}`}>{pct(o.changePct)}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {defs.map((d) => (
          <Link key={d.key} href={href(market, d.key)} className="pill" data-active={def.key === d.key}>
            {d.label}
          </Link>
        ))}
      </div>

      <section className="card overflow-x-auto">
        {page.items.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">
            {page.updatedAt ? "Tidak ada aset di daftar ini." : "Data pasar sedang dimuat. Muat ulang beberapa detik lagi."}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Aset</th>
                <th className="num">Harga</th>
                <th className="num">Perubahan</th>
                {show7d && <th className="num">7 hari</th>}
                {showCap && <th className="num">Kapitalisasi</th>}
              </tr>
            </thead>
            <tbody>
              {page.items.map((i) => (
                <tr key={i.symbol}>
                  <td>
                    <div className="flex items-center gap-3">
                      <AssetIcon symbol={i.symbol} color={MARKET_COLOR[market]} icon={i.icon} size={32} />
                      <div>
                        <div>{i.symbol}</div>
                        <div className="max-w-[240px] truncate text-[11px] text-[var(--muted)]">{i.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num">{unitPrice(i.price, i.ccy)}</td>
                  <td className={`num ${(i.changePct ?? 0) >= 0 ? "up" : "down"}`}>{i.changePct === null ? "" : pct(i.changePct)}</td>
                  {show7d && (
                    <td className={`num ${(i.change7d ?? 0) >= 0 ? "up" : "down"}`}>{i.change7d === null ? "" : pct(i.change7d)}</td>
                  )}
                  {showCap && <td className="num text-[var(--muted)]">{i.capLabel ?? ""}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs text-[var(--muted)]">
        Sumber: Pluang (saham IDX dan US) dan CoinMarketCap (crypto). Data pasar bisa tertunda dan bukan saran investasi.
      </p>
    </>
  );
}
