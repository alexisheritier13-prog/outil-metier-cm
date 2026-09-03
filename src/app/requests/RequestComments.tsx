import { useState } from 'react';
import { textareaClass } from '@/components/form';
import { Button } from '@/components/ui/button';
import { useAddRequestComment, useRequestComments } from './useRequests';
import { parisDateLabel } from '@/shared/utils/tz';

/** Fil de commentaires d'une demande client — partagé portail / interne. */
export function RequestComments({
  requestId,
  authorName,
}: {
  requestId: string;
  authorName?: (id: string) => string;
}) {
  const comments = useRequestComments(requestId);
  const add = useAddRequestComment(requestId);
  const [body, setBody] = useState('');

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs font-medium">Échanges</p>
      <ul className="space-y-2">
        {(comments.data ?? []).map((c) => (
          <li key={c.id} className="bg-surface-2 rounded border p-2 text-sm">
            <p className="text-muted-foreground mb-1 text-xs">
              {authorName ? `${authorName(c.authorId)} · ` : ''}
              {parisDateLabel(c.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
        {(comments.data ?? []).length === 0 && (
          <li className="text-muted-foreground text-sm">Aucun échange.</li>
        )}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          add.mutate(body, { onSuccess: () => setBody('') });
        }}
      >
        <textarea
          className={textareaClass}
          rows={2}
          placeholder="Répondre…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Nouveau commentaire"
        />
        <Button size="sm" type="submit" disabled={add.isPending || !body.trim()}>
          Envoyer
        </Button>
      </form>
    </div>
  );
}
