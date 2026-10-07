import { redirect } from "next/navigation";

// Middleware sudah memastikan hanya pengguna login yang sampai di sini.
export default function Home() {
  redirect("/dashboard");
}
