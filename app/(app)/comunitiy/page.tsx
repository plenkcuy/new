import { Heart, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireFeature } from "@/lib/auth/guards";
import { getPosts, getTrendingTopics } from "@/lib/data/community";

export default async function CommunityPage() {
  await requireFeature("community", "/community");
  const [posts, topics] = await Promise.all([getPosts(), getTrendingTopics()]);

  return (
    <>
      <PageHeader title="Komunitas" subtitle="Diskusi antar investor dan analis" />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <article key={p.id} className="card p-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
                  style={{ background: "linear-gradient(135deg,#14b8a6,#115e59)" }}
                  aria-hidden
                >
                  {p.author[0]}
                </div>
                <div className="leading-tight">
                  <div className="text-sm">{p.author}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {p.role} · {p.time}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[var(--text)]/90">{p.body}</p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span key={t} className="badge badge-free">
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Heart size={14} /> {p.likes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle size={14} /> {p.replies}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="card h-fit p-6">
          <h2 className="text-lg">Topik populer</h2>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {topics.map((t) => (
              <li key={t.tag} className="flex items-center justify-between py-3 text-sm">
                <span>#{t.tag}</span>
                <span className="text-xs text-[var(--muted)]">{t.posts} posting</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <p className="text-xs text-[var(--muted)]">Konten tiruan untuk demo UI. Bukan saran investasi.</p>
    </>
  );
}
