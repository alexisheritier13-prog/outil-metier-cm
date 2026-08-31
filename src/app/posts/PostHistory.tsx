import { useQuery } from '@tanstack/react-query';
import { listInternalUsers } from '@/services/users';
import { listPostHistory } from '@/services/postHistory';
import { POST_STATUS_LABELS, isPostStatus } from '@/shared/constants/postStatus';

const FIELD_LABELS: Record<string, string> = {
  caption: 'Légende',
  scheduled_at: 'Date',
  network: 'Réseau',
  canva_url: 'Lien Canva',
  campaign_id: 'Campagne',
  author_id: 'Rédacteur',
  performance_note: 'Note de performance',
  performance_visible_to_client: 'Visibilité de la note (client)',
  status: 'Statut',
};

function describe(action: string, field: string | null, newV: string | null): string {
  if (action === 'create') return 'Post créé';
  if (action === 'trash') return 'Mis à la corbeille';
  if (action === 'restore') return 'Restauré';
  if (action === 'comment') return 'Commentaire ajouté';
  if (action === 'status_change') {
    const to = newV && isPostStatus(newV) ? POST_STATUS_LABELS[newV] : newV;
    return `Statut → ${to}`;
  }
  const label = field ? (FIELD_LABELS[field] ?? field) : 'Champ';
  return `${label} modifié`;
}

export function PostHistory({ postId }: { postId: string }) {
  const history = useQuery({ queryKey: ['post-history', postId], queryFn: () => listPostHistory(postId) });
  const authors = useQuery({ queryKey: ['internal-users-lite'], queryFn: listInternalUsers });

  const name = (id: string | null) => {
    if (!id) return 'Système';
    const a = (authors.data ?? []).find((u) => u.id === id);
    return a?.fullName || a?.email || 'Utilisateur';
  };

  if (history.isLoading) return <p className="text-muted-foreground text-sm">Chargement…</p>;
  const rows = history.data ?? [];
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">Aucun historique.</p>;

  return (
    <ol className="space-y-2 text-sm">
      {rows.map((h) => (
        <li key={h.id} className="flex flex-col border-b pb-2 last:border-b-0">
          <span>{describe(h.action, h.field, h.newValue)}</span>
          <span className="text-muted-foreground text-xs">
            {name(h.actorId)} · {new Date(h.createdAt).toLocaleString('fr-FR')}
          </span>
        </li>
      ))}
    </ol>
  );
}
