"use client";

import { useMemo, useState } from "react";
import type { Article, Block, Category, HelpLink } from "@/lib/help/content";

type Props = { categories: Category[]; references: HelpLink[]; email: string };

const blockText = (b: Block): string => (b.t === "steps" || b.t === "list" ? b.items.join(" ") : b.text);

const haystack = (a: Article) => `${a.title} ${a.summary} ${a.keywords} ${a.blocks.map(blockText).join(" ")}`.toLowerCase();

/** Setiap kata dalam kueri harus ada di artikel. Urutan kata tidak penting. */
function matches(a: Article, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack(a);
  return words.every((w) => text.includes(w));
}

function Body({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.t === "p") return <p key={i}>{b.text}</p>;
        if (b.t === "steps")
          return (
            <ol key={i} className="flex list-decimal flex-col gap-2 pl-5">
              {b.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          );
        if (b.t === "list")
          return (
            <ul key={i} className="flex list-disc flex-col gap-2 pl-5">
              {b.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        return (
          <div key={i} className="rounded-2xl border border-[var(--line)] bg-white/5 p-4 text-[var(--muted)]">
            <span className="font-medium text-[var(--text)]">Catatan penting. </span>
            {b.text}
          </div>
        );
      })}
    </div>
  );
}

function ArticleItem({ article, open }: { article: Article; open: boolean }) {
  return (
    <details key={`${article.id}-${open}`} open={open} className="card p-5 [&_summary]:cursor-pointer" id={article.id}>
      <summary className="flex flex-col gap-1">
        <span className="text-base font-medium">{article.title}</span>
        <span className="text-sm text-[var(--muted)]">{article.summary}</span>
      </summary>
      <div className="mt-4">
        <Body blocks={article.blocks} />
      </div>
    </details>
  );
}

export function HelpCenter({ categories, references, email }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  const results = useMemo(() => {
    if (!q) return null;
    return categories
      .map((c) => ({ category: c, articles: c.articles.filter((a) => matches(a, q)) }))
      .filter((r) => r.articles.length > 0);
  }, [categories, q]);

  return (
    <>
      <section className="card flex flex-col gap-3 p-5">
        <label htmlFor="help-search" className="text-sm font-medium">
          Cari di bantuan
        </label>
        <input
          id="help-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Contoh: meme coin, harga tidak muncul, watchlist penuh"
          className="min-h-[44px] w-full rounded-full border border-white/20 bg-transparent px-5 text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
        <nav aria-label="Kategori bantuan" className="flex flex-wrap gap-2 pt-1">
          {categories.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="pill !min-h-[32px] !px-3 !py-1.5 !text-xs">
              {c.title}
            </a>
          ))}
        </nav>
      </section>

      {results ? (
        results.length === 0 ? (
          <section className="card p-6 text-sm leading-relaxed text-[var(--muted)]">
            Tidak ada artikel yang cocok dengan &quot;{q}&quot;. Coba kata lain, atau lihat daftar kategori di atas. Kalau masih belum ketemu, hubungi kami lewat email di bawah.
          </section>
        ) : (
          <section className="flex flex-col gap-6" aria-label="Hasil pencarian">
            <p className="text-sm text-[var(--muted)]">
              {results.reduce((n, r) => n + r.articles.length, 0)} artikel ditemukan
            </p>
            {results.map((r) => (
              <div key={r.category.id} className="flex flex-col gap-3">
                <h2 className="text-lg">{r.category.title}</h2>
                {r.articles.map((a) => (
                  <ArticleItem key={a.id} article={a} open />
                ))}
              </div>
            ))}
          </section>
        )
      ) : (
        categories.map((c) => (
          <section key={c.id} id={c.id} className="flex scroll-mt-24 flex-col gap-3">
            <div>
              <h2 className="text-lg">{c.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{c.intro}</p>
            </div>
            {c.articles.map((a) => (
              <ArticleItem key={a.id} article={a} open={false} />
            ))}
          </section>
        ))
      )}

      <section id="referensi" className="card flex scroll-mt-24 flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg">Referensi dan dokumentasi</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Sumber resmi yang dipakai Lumen, untuk kamu baca lebih dalam.</p>
        </div>
        <ul className="flex flex-col gap-3">
          {references.map((r) => (
            <li key={r.href} className="flex flex-col gap-0.5">
              <a href={r.href} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] underline-offset-4 hover:underline">
                {r.label}
              </a>
              <span className="text-xs text-[var(--muted)]">{r.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="hubungi" className="card flex scroll-mt-24 flex-col gap-2 p-6">
        <h2 className="text-lg">Hubungi kami</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Belum menemukan jawaban? Kirim pertanyaanmu lewat email, dan sebutkan email akun serta halaman yang kamu maksud.
        </p>
        <a className="text-sm text-[var(--accent)] underline-offset-4 hover:underline" href={`mailto:${email}`}>
          {email}
        </a>
      </section>
    </>
  );
}
