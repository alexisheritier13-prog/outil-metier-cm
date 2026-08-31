import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { POST_STATUS_LABELS, type PostStatus } from '@/shared/constants/postStatus';
import type { Role } from '@/shared/constants/roles';
import {
  allowedTransitions,
  transitionDirection,
  transitionNeedsComment,
} from '@/shared/utils/transitions';
import type { Post } from '@/shared/types';
import { useChangePostStatus } from './usePosts';
import { useWorkflowOptions } from './useWorkflow';

/**
 * Actions de workflow d'un post (Story 5.1) : boutons nommés pour chaque transition
 * permise au rôle courant, avec dialogue de commentaire quand la transition l'exige
 * (ex. « Renvoyer au rédacteur »). La source de vérité reste `canTransition` / le RPC.
 */

const ACTION_LABELS: Record<string, string> = {
  'draft>internal_review': 'Soumettre à la validation interne',
  'draft>client_review': 'Envoyer au client',
  'internal_review>client_review': 'Valider en interne',
  'internal_review>draft': 'Renvoyer au rédacteur',
  'client_review>draft': 'Repasser en brouillon',
  'client_review>internal_review': 'Repasser en validation interne',
  'approved>scheduled': 'Planifier',
  'approved>draft': 'Repasser en brouillon',
  'approved>internal_review': 'Repasser en validation interne',
  'approved>client_review': 'Renvoyer au client',
  'scheduled>published': 'Marquer comme publié',
  'scheduled>approved': 'Repasser en « validé »',
  'scheduled>draft': 'Repasser en brouillon',
  'published>scheduled': 'Repasser en « planifié »',
};

const actionLabel = (from: PostStatus, to: PostStatus) =>
  ACTION_LABELS[`${from}>${to}`] ?? `→ ${POST_STATUS_LABELS[to]}`;

export function StatusActions({ post, role }: { post: Post; role: Role }) {
  const change = useChangePostStatus();
  const workflow = useWorkflowOptions();
  const [ask, setAsk] = useState<{ to: PostStatus; label: string } | null>(null);
  const [comment, setComment] = useState('');

  const targets = allowedTransitions(post.status, role, workflow);

  function run(to: PostStatus) {
    const label = actionLabel(post.status, to);
    if (transitionNeedsComment(post.status, to)) {
      setComment('');
      setAsk({ to, label });
      return;
    }
    change.mutate({ id: post.id, to });
  }

  return (
    <div className="space-y-2">
      <StatusBadge status={post.status} />

      {targets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {targets.map((to) => {
            const backward = transitionDirection(post.status, to) === 'backward';
            return (
              <Button
                key={to}
                size="sm"
                variant={backward ? 'outline' : 'default'}
                disabled={change.isPending}
                onClick={() => run(to)}
              >
                {actionLabel(post.status, to)}
              </Button>
            );
          })}
        </div>
      )}

      {change.isError && (
        <p className="text-destructive text-xs">{(change.error as Error).message}</p>
      )}

      <Dialog open={Boolean(ask)} onOpenChange={(v) => !v && setAsk(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ask?.label}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Un commentaire est obligatoire pour expliquer ce qui doit être revu.
          </p>
          <textarea
            className="border-input bg-surface focus-visible:ring-ring w-full rounded border px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            aria-label="Commentaire"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAsk(null)}>
              Annuler
            </Button>
            <Button
              disabled={!comment.trim() || change.isPending}
              onClick={async () => {
                if (!ask) return;
                await change.mutateAsync({ id: post.id, to: ask.to, comment: comment.trim() });
                setAsk(null);
              }}
            >
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
