import { PageHeader } from "@/components/ui";
import { FuturesView } from "./futures-view";

export async function FuturesScreen() {
  return (
    <>
      <PageHeader
        title="Futures Sentiment"
        subtitle="Screening funding rate, open interest, dan long short ratio, dipadukan dengan konfluensi teknikal harian"
      />
      <FuturesView />
    </>
  );
}
