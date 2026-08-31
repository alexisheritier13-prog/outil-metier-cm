import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { listInternalUsers } from '@/services/users';
import {
  addPostComment,
  deletePostComment,
  listPostComments,
  updatePostComment,
} from '@/services/postComments';
import type { CommentVisibility } from '@/shared/types';

const key = (postId: string) => ['post-comments', postId] as const;

export function CommentThread({ postId }: { postId: string }) {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const comments = useQuery({ queryKey: key(postId), queryFn: () => listPostComments(postId) });
  const authors = useQuery({ queryKey: ['internal-users-lite'], queryFn: listInternalUsers });
  const invalidate = () => qc.invalidateQueries({ queryKey: key(postId) });

  const add = useMutation({
    mutationFn: ({ body, visibility }: { body: string; visibility: CommentVisibility }) =>
      addPostComment(postId, body, visibility),
    onSuccess: invalidate,
  });
  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updatePostComment(id, body),
    onSuccess: invalidate,
  });
  const del = useMutation({ mutationFn: deletePostComment, onSuccess: invalidate });

  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<CommentVisibility>('internal');
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);

  const name = (id: string) => {
    const a = (authors.data ?? []).find((u) => u.id === id);
    return a?.fullName || a?.email || 'Utilisateur';
  };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs font-medium">Commentaires</p>

      <ul className="space-y-2">
        {(comments.data ?? []).map((c) => (
          <li key={c.id} className="bg-surface-2 rounded border p-2 text-sm">
            <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
              <span className="font-medium">{name(c.authorId)}</span>
              <span>{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
              <span className="rounded border px-1">
                {c.visibility === 'client' ? 'visible client' : 'interne'}
              </span>
            </div>
            {editing?.id === c.id ? (
              <div className="space-y-1.5">
                <textarea
                  className="border-input bg-background w-full rounded border px-2 py-1 text-sm"
                  rows={2}
                  value={editing.body}
                  onChange={(e) => setEditing({ id: c.id, body: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await edit.mutateAsync({ id: c.id, body: editing.body });
                      setEditing(null);
                    }}
                  >
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap">{c.body}</p>
                {(c.authorId === me?.id || me?.role === 'lead' || me?.role === 'admin') && (
                  <div className="mt-1 flex gap-2">
                    {c.authorId === me?.id && (
                      <button
                        type="button"
                        className="text-muted-foreground text-xs hover:underline"
                        onClick={() => setEditing({ id: c.id, body: c.body })}
                      >
                        Modifier
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-muted-foreground text-xs hover:underline"
                      onClick={() => del.mutate(c.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
        {(comments.data ?? []).length === 0 && (
          <li className="text-muted-foreground text-sm">Aucun commentaire.</li>
        )}
      </ul>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          add.mutate({ body, visibility });
          setBody('');
        }}
      >
        <textarea
          className="border-input bg-background focus-visible:ring-ring w-full rounded border px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2"
          rows={2}
          placeholder="Ajouter un commentaire…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Nouveau commentaire"
        />
        <div className="flex items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={visibility === 'client'}
              onChange={(e) => setVisibility(e.target.checked ? 'client' : 'internal')}
            />
            Visible par le client
          </label>
          <Button size="sm" type="submit" disabled={add.isPending}>
            Commenter
          </Button>
        </div>
      </form>
    </div>
  );
}
