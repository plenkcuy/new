import { PageHeader } from "@/components/ui/PageHeader";
import { SymbolDot } from "@/components/ui/SymbolDot";
import { requireSession } from "@/lib/auth/guards";
import { getMarketOverview } from "@/lib/data/market";
import { decimal, num, pct } from "@/lib/format";
import { limitsFor } from "@/lib/plans";

export default async function MarketPage() {
  const { user } = await requireSession();
  const { marketFeed } = limitsFor(user.tier);
  const { indices, rows } = await getMarketOverview();

  return (
    <>
      <PageHeader title="Pasar" subtitle="Indeks dan saham paling aktif hari ini">
        <span className="pill">{marketFeed === "realtime" ? "Feed real-time" : "Feed tertunda 15 menit"}</span>
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {indices.map((i) => (
          <div key={i.code} className="card p-5">
            <div className="text-xs text-[var(--muted)]">{i.code}</div>
            <div className="mt-2 text-2xl font-medium tracking-tight">{decimal(i.value)}</div>
            <div className={`mt-1 text-xs ${i.change >= 0 ? "up" : "down"}`}>{pct(i.change)}</div>
          </div>
        ))}
      </div>

      <section className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Saham</th>
              <th>Sektor</th>
              <th className="num">Harga</th>
              <th className="num">Perubahan</th>
              <th className="num">Volume (juta)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol}>
                <td>
                  <div className="flex items-center gap-3">
                    <SymbolDot symbol={r.symbol} color={r.color} size={32} />
                    <div>
                      <div>{r.symbol}</div>
                      <div className="text-[11px] text-[var(--muted)]">{r.name}</div>
                    </div>
                  </div>
                </td>
                <td className="text-[var(--muted)]">{r.sector}</td>
                <td className="num">Rp {num(r.price)}</td>
                <td className={`num ${r.change >= 0 ? "up" : "down"}`}>{pct(r.change)}</td>
                <td className="num">{decimal(r.volume, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-[var(--muted)]">Data tiruan untuk demo UI.</p>
    </>
  );
}
