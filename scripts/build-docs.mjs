// Membuat docs/PANDUAN-PENGGUNA.md dari lib/help/content.ts (sumber yang sama dengan halaman Bantuan).
// Jalankan: npm run docs
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const src = fs.readFileSync(path.join(root, "lib/help/content.ts"), "utf8");
const { outputText } = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const mod = { exports: {} };
new Function("module", "exports", outputText)(mod, mod.exports);
const { HELP_CATEGORIES, HELP_REFERENCES, SUPPORT_EMAIL } = mod.exports;

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const out = [];
out.push("# Panduan Pengguna Lumen Invest", "");
out.push("Dokumen ini dibuat otomatis dari halaman Bantuan di aplikasi. Untuk mengubah isinya, edit `lib/help/content.ts`, lalu jalankan `npm run docs`.", "");
out.push("## Daftar isi", "");
for (const c of HELP_CATEGORIES) out.push(`- [${c.title}](#${slug(c.title)})`);
out.push("- [Referensi dan dokumentasi](#referensi-dan-dokumentasi)", "- [Hubungi kami](#hubungi-kami)", "");

for (const c of HELP_CATEGORIES) {
  out.push(`## ${c.title}`, "", c.intro, "");
  for (const a of c.articles) {
    out.push(`### ${a.title}`, "", `_${a.summary}_`, "");
    for (const b of a.blocks) {
      if (b.t === "p") out.push(b.text, "");
      else if (b.t === "steps") out.push(...b.items.map((item, i) => `${i + 1}. ${item}`), "");
      else if (b.t === "list") out.push(...b.items.map((item) => `* ${item}`), "");
      else out.push(`> Catatan penting: ${b.text}`, "");
    }
  }
}

out.push("## Referensi dan dokumentasi", "");
for (const r of HELP_REFERENCES) out.push(`* [${r.label}](${r.href}): ${r.note}`);
out.push("", "## Hubungi kami", "", `Email: ${SUPPORT_EMAIL}`, "");

fs.writeFileSync(path.join(root, "docs/PANDUAN-PENGGUNA.md"), out.join("\n"));
console.log("docs/PANDUAN-PENGGUNA.md dibuat");
