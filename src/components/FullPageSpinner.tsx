export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
      <span
        className="border-muted-foreground/30 border-t-primary h-8 w-8 animate-spin rounded-full border-4"
        aria-hidden="true"
      />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
