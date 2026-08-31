import { useEffect, useState } from 'react';
import { BarChart3, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Post } from '@/shared/types';
import { useUpdatePerformance } from './usePosts';

/**
 * Note de performance d'un post (Story 9.4). Éditable uniquement quand le post est
 * « publié » ; sinon affichée en lecture seule si elle existe (statut revenu en
 * arrière). La visibilité de la note pour le client est un choix explicite,
 * interne par défaut.
 */
export function PerformanceSection({ post }: { post: Post }) {
  const editable = post.status === 'published';
  const update = useUpdatePerformance(post.id);

  const [note, setNote] = useState(post.performanceNote ?? '');
  const [visible, setVisible] = useState(post.performanceVisibleToClient);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNote(post.performanceNote ?? '');
    setVisible(post.performanceVisibleToClient);
  }, [post.id, post.performanceNote, post.performanceVisibleToClient]);

  const dirty =
    note.trim() !== (post.performanceNote ?? '').trim() ||
    visible !== post.performanceVisibleToClient;

  if (!editable) {
    if (!post.performanceNote) return null;
    return (
      <div>
        <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Performance
        </p>
        <p className="whitespace-pre-wrap text-sm">{post.performanceNote}</p>
      </div>
    );
  }

  function save() {
    update.mutate(
      { note: note.trim() || null, visibleToClient: visible },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  }

  return (
    <div>
      <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Performance
      </p>
      <textarea
        className="border-input bg-surface focus-visible:border-primary w-full rounded-md border px-2.5 py-1.5 text-sm outline-none transition-colors"
        rows={3}
        placeholder="Ex. 820 likes, 34 partages, +180 abonnés…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Note de performance"
      />
      <label className="text-muted-foreground mt-2 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-primary h-3.5 w-3.5"
          checked={visible}
          disabled={!note.trim()}
          onChange={(e) => setVisible(e.target.checked)}
        />
        Visible par le client dans son espace
      </label>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={!dirty || update.isPending} onClick={save}>
          Enregistrer
        </Button>
        {saved && (
          <span className="text-success-strong flex items-center gap-1 text-xs" role="status">
            <Check className="h-3.5 w-3.5" /> Enregistré
          </span>
        )}
      </div>
    </div>
  );
}
