import "server-only";

export type Post = {
  id: string;
  author: string;
  role: "Analis" | "Investor";
  time: string;
  body: string;
  likes: number;
  replies: number;
  tags: string[];
};

/** Konten tiruan untuk demo UI. Bukan saran investasi. */
const POSTS: readonly Post[] = [
  {
    id: "p1",
    author: "Maya Putri",
    role: "Analis",
    time: "2 jam lalu",
    body: "Rilis kuartal terbaru sektor perbankan menunjukkan pertumbuhan kredit yang stabil. Menarik melihat bagaimana margin bunga bersih bergerak dalam beberapa kuartal ke depan.",
    likes: 42,
    replies: 9,
    tags: ["Perbankan", "Kuartalan"],
  },
  {
    id: "p2",
    author: "Citra Lestari",
    role: "Investor",
    time: "5 jam lalu",
    body: "Saya mulai mencatat alokasi per sektor setiap bulan. Ternyata porsi kas saya lebih besar dari yang saya kira. Ada yang punya template pencatatan yang praktis?",
    likes: 18,
    replies: 14,
    tags: ["Alokasi", "Pencatatan"],
  },
  {
    id: "p3",
    author: "Eka Nugroho",
    role: "Investor",
    time: "Kemarin",
    body: "Diskusi minggu ini: seberapa sering kalian meninjau ulang portofolio? Bulanan, kuartalan, atau hanya saat ada berita besar?",
    likes: 27,
    replies: 31,
    tags: ["Diskusi"],
  },
  {
    id: "p4",
    author: "Sinta Wijaya",
    role: "Analis",
    time: "2 hari lalu",
    body: "Pengingat: diversifikasi tidak menghilangkan risiko, tetapi dapat membantu menurunkan dampak satu emiten terhadap keseluruhan portofolio.",
    likes: 63,
    replies: 6,
    tags: ["Risiko", "Edukasi"],
  },
];

const TOPICS = [
  { tag: "Perbankan", posts: 128 },
  { tag: "Alokasi", posts: 96 },
  { tag: "Dividen", posts: 74 },
  { tag: "Edukasi", posts: 61 },
  { tag: "Risiko", posts: 45 },
];

export async function getPosts(): Promise<Post[]> {
  return [...POSTS];
}

export async function getTrendingTopics(): Promise<{ tag: string; posts: number }[]> {
  return [...TOPICS];
}
