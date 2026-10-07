import { AiInsights } from "@/components/AiInsights";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Portfolio } from "@/components/Portfolio";
import { TopTabs } from "@/components/TopTabs";
import { TotalHolding } from "@/components/TotalHolding";
import { Watchlist } from "@/components/Watchlist";

export default function Page() {
  return (
    <AppShell>
      <Header />
      <TopTabs />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_1.05fr_1fr]">
        <div className="flex flex-col gap-5">
          <TotalHolding />
          <AiInsights />
        </div>
        <Watchlist />
        <div className="md:col-span-2 xl:col-span-1">
          <Portfolio />
        </div>
      </div>

      <PerformanceChart />
    </AppShell>
  );
}
