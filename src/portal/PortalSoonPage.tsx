import { EmptyState } from '@/components/EmptyState';

/** Placeholder des sections client livrées dans les stories suivantes de l'Epic 6. */
export function PortalSoonPage({ title, note }: { title: string; note: string }) {
  return (
    <section className="p-4 sm:p-6">
      <h1 className="text-title mb-4">{title}</h1>
      <EmptyState title="Bientôt disponible" description={note} />
    </section>
  );
}
