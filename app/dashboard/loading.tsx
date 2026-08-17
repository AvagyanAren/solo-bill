import { PageContainer } from "@/components/page-shell";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-secondary ${className ?? ""}`} />;
}

/** Shown immediately while a dashboard segment RSC payload is loading. */
export default function DashboardLoading() {
  return (
    <PageContainer aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page…</span>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-4 w-64 max-w-full" />
        </div>
        <SkeletonBlock className="h-11 w-32 shrink-0" />
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-48" />
      </div>
      <div className="mt-8">
        <SkeletonBlock className="h-56" />
      </div>
    </PageContainer>
  );
}
