import { cn } from '@/lib/utils';

/** Bloc de chargement — préféré au spinner central pour le contenu (spec §4.1). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('bg-surface-2 animate-pulse rounded-md', className)} />;
}

/** Squelette de tableau : en-tête + n lignes. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Chargement…">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full opacity-70" />
      ))}
    </div>
  );
}
