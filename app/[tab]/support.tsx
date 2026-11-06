import { PageHeader } from "@/components/ui";
import { HELP_CATEGORIES, HELP_REFERENCES, SUPPORT_EMAIL } from "@/lib/help/content";
import type { ScreenProps } from "@/lib/shared";
import { HelpCenter } from "./help-center";

/** Tab Bantuan: pencarian, panduan per fitur, istilah, referensi resmi, dan kontak. */
export async function SupportScreen(_: ScreenProps) {
  return (
    <>
      <PageHeader title="Bantuan" subtitle="Panduan lengkap, istilah, referensi, dan cara menghubungi kami" />
      <HelpCenter categories={HELP_CATEGORIES} references={HELP_REFERENCES} email={SUPPORT_EMAIL} />
    </>
  );
}
