import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Memuat halaman</span>
      <div className="flex flex-col gap-3 lg:pr-80">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-36" />
          </div>
        ))}
      </div>
      <div className="grid items-stretch gap-6 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-6 h-40 w-full" />
            <Skeleton className="mt-4 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
