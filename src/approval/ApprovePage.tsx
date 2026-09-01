import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { PostPreview } from '@/components/PostPreview';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import { approveViaToken, fetchApprovalPost, rejectViaToken } from '@/services/approval';

export function ApprovePage() {
  const { token = '' } = useParams();
  const q = useQuery({
    queryKey: ['approval', token],
    queryFn: () => fetchApprovalPost(token),
    retry: false,
  });

  const [mode, setMode] = useState<'idle' | 'reject'>('idle');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  const approve = useMutation({
    mutationFn: () => approveViaToken(token),
    onSuccess: (r) => {
      if (r === 'ok') setDone('approved');
      else q.refetch();
    },
  });
  const reject = useMutation({
    mutationFn: () => rejectViaToken(token, comment),
    onSuccess: (r) => {
      if (r === 'ok') setDone('rejected');
      else q.refetch();
    },
  });

  if (q.isLoading) return <FullPageSpinner />;

  const post = q.data;
  const unavailable = !post || post.used || post.status !== 'client_review';

  return (
    <main className="bg-background flex min-h-dvh items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-lg text-sm font-bold">
            C
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            {post?.clientName ? `Validation — ${post.clientName}` : 'Validation de post'}
          </span>
        </div>

        {done ? (
          <div className="bg-surface shadow-panel space-y-2 rounded-2xl border p-6">
            <h1 className="text-title tracking-tight">
              {done === 'approved' ? 'Post approuvé' : 'Demande envoyée'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {done === 'approved'
                ? "L'agence a été prévenue. Vous pouvez fermer cette page."
                : "L'agence a reçu votre demande de modification et repassera vous voir."}
            </p>
          </div>
        ) : unavailable ? (
          <div className="bg-surface shadow-panel space-y-2 rounded-2xl border p-6">
            <h1 className="text-title tracking-tight">Lien plus valable</h1>
            <p className="text-muted-foreground text-sm">
              Ce post a déjà été traité, ou le lien a expiré. Contactez votre agence si besoin.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-surface shadow-panel overflow-hidden rounded-2xl border">
              <div className="bg-surface-2 border-b p-4">
                <PostPreview
                  network={post.network}
                  name={post.clientName}
                  logoUrl={post.clientLogoUrl}
                  caption={post.caption}
                  media={post.media}
                  scheduledAt={post.scheduledAt}
                />
              </div>
              <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5 p-4 text-sm">
                <dt className="text-muted-foreground">Prévu le</dt>
                <dd>
                  {parisDateLabel(post.scheduledAt)} à {parisTimeLabel(post.scheduledAt)}
                </dd>
                <dt className="text-muted-foreground">Réseau</dt>
                <dd>{NETWORK_LABELS[post.network]}</dd>
              </dl>

              {post.comments.filter((c) => !c.system).length > 0 && (
                <div className="border-t p-4">
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Échanges</p>
                  <ul className="space-y-2 text-sm">
                    {post.comments
                      .filter((c) => !c.system)
                      .map((c, i) => (
                        <li key={i} className="bg-surface-2 rounded-lg border p-2">
                          <p className="text-muted-foreground mb-0.5 text-xs">
                            {parisDateLabel(c.createdAt)}
                          </p>
                          {c.body}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            {mode === 'idle' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="flex-1"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate()}
                >
                  <Check className="h-4 w-4" /> {approve.isPending ? 'Envoi…' : 'Approuver'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setMode('reject')}>
                  Demander une modification
                </Button>
              </div>
            ) : (
              <div className="bg-surface shadow-panel space-y-2.5 rounded-2xl border p-4">
                <label htmlFor="ap-comment" className="text-sm font-medium">
                  Que faut-il modifier ?
                </label>
                <textarea
                  id="ap-comment"
                  rows={4}
                  className="border-input bg-surface focus-visible:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={!comment.trim() || reject.isPending}
                    onClick={() => reject.mutate()}
                  >
                    {reject.isPending ? 'Envoi…' : 'Envoyer la demande'}
                  </Button>
                  <Button variant="ghost" onClick={() => setMode('idle')}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {(approve.isError || reject.isError) && (
              <p className="text-danger-strong text-sm" role="alert">
                Une erreur est survenue. Réessayez.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
