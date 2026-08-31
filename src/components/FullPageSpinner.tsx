/** Chargement plein écran — réservé au fallback de route (Suspense). En page, préférer un skeleton. */
export function FullPageSpinner() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span
        className="border-muted-foreground/25 border-t-foreground h-7 w-7 animate-spin rounded-full border-[3px]"
        aria-hidden="true"
      />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
