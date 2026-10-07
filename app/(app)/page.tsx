import { PageHeader } from "@/components/ui/PageHeader";
import { requireSession } from "@/lib/auth/guards";

const FAQ = [
  {
    q: "Apa bedanya paket Free dan Premium?",
    a: "Free mencakup dashboard, portofolio, dan pasar dengan batas tertentu. Premium menambah Insight AI, analisis lanjutan, komunitas, ekspor CSV, rentang grafik penuh, dan feed real-time. Bandingkan lengkapnya di halaman Upgrade.",
  },
  {
    q: "Bagaimana cara upgrade ke Premium?",
    a: "Pembayaran otomatis belum terhubung pada versi demo ini. Hubungi tim kami lewat email di bawah dan paketmu akan diaktifkan.",
  },
  {
    q: "Apakah data di dashboard real-time?",
    a: "Belum. Seluruh data pada versi ini adalah data tiruan untuk demo tampilan dan tidak mencerminkan harga pasar sebenarnya.",
  },
  {
    q: "Bagaimana mengekspor portofolio?",
    a: "Pengguna Premium dapat mengunduh portofolio dalam format CSV dari halaman Portofolio.",
  },
];

export default async function SupportPage() {
  await requireSession();

  return (
    <>
      <PageHeader title="Bantuan" subtitle="Pertanyaan umum dan cara menghubungi kami" />

      <section className="flex flex-col gap-3">
        {FAQ.map((item) => (
          <details key={item.q} className="card p-5 [&_summary]:cursor-pointer">
            <summary className="text-sm">{item.q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="text-lg">Hubungi kami</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Email:{" "}
          <a className="text-[var(--accent)] underline-offset-4 hover:underline" href="mailto:support@lumen.example">
            support@lumen.example
          </a>
        </p>
      </section>
    </>
  );
}
