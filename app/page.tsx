import { AiInsights } from "@/components/AiInsights";
import { Header } from "@/components/Header";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Portfolio } from "@/components/Portfolio";
import { Sidebar } from "@/components/Sidebar";
import { TopTabs } from "@/components/TopTabs";
import { TotalHolding } from "@/components/TotalHolding";
import { Watchlist } from "@/components/Watchlist";

export default function Page() {
  return (
    <div className="mx-auto min-h-screen max-w-[1600px] p-3 sm:p-5">
      <div className="grid gap-5 rounded-[32px] border border-white/5 bg-white/[0.04] p-3 backdrop-blur-sm sm:p-5 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="flex min-w-0 flex-col gap-5">
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
        </main>
      </div>
    </div>
  );
}
