import { useState } from 'react';
import { Inbox, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { NetworkIcon } from '@/components/NetworkIcon';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { RequestStatusBadge } from '@/app/requests/RequestStatusBadge';
import { RequestComments } from '@/app/requests/RequestComments';
import {
  useClientRequests,
  useCreateRequest,
  usePostsFromRequest,
  useUpdateRequest,
} from '@/app/requests/useRequests';
import { usePortalClient } from './PortalClientContext';

interface Draft {
  title: string;
  description: string;
  wantedNetwork: Network | '';
  wantedDate: string;
}
const emptyDraft: Draft = { title: '', description: '', wantedNetwork: '', wantedDate: '' };

export function PortalBriefsPage() {
  const client = usePortalClient();
  const requests = useClientRequests({ clientId: client.id });
  const create = useCreateRequest();
  const update = useUpdateRequest();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft | null>(null);

  const open = (requests.data ?? []).find((r) => r.id === openId) ?? null;
  const linked = usePostsFromRequest(openId);

  if (requests.isLoading) return <FullPageSpinner />;

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    create.mutate(
      {
        clientId: client.id,
        title: draft.title,
        description: draft.description,
        wantedNetwork: draft.wantedNetwork || null,
        wantedDate: draft.wantedDate || null,
      },
      {
        onSuccess: () => {
          setDraft(emptyDraft);
          setCreating(false);
        },
      },
    );
  }

  return (
    <section className="mx-auto max-w-5xl p-4 sm:p-6 lg:py-8">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-title tracking-tight">Briefs</h1>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" /> Nouvelle demande
        </Button>
      </header>

      {creating && (
        <form onSubmit={submitNew} className="mb-6 space-y-3 rounded-md border p-4">
          <input
            className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
            placeholder="Titre de la demande"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            aria-label="Titre"
          />
          <textarea
            className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
            rows={3}
            placeholder="Décrivez ce que vous souhaitez…"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            aria-label="Description"
          />
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="text-muted-foreground mb-1 block text-xs">Réseau souhaité</span>
              <select
                className="field"
                value={draft.wantedNetwork}
                onChange={(e) =>
                  setDraft({ ...draft, wantedNetwork: e.target.value as Network | '' })
                }
              >
                <option value="">Peu importe</option>
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {NETWORK_LABELS[n]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground mb-1 block text-xs">Échéance souhaitée</span>
              <input
                type="date"
                className="field"
                value={draft.wantedDate}
                onChange={(e) => setDraft({ ...draft, wantedDate: e.target.value })}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={create.isPending || !draft.title.trim()}>
              Envoyer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {(requests.data ?? []).length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aucune demande"
          description="Déposez une demande pour que votre agence prépare le contenu dont vous avez besoin."
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {(requests.data ?? []).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setOpenId(r.id);
                  setEdit(null);
                }}
                className="hover:bg-surface-2/60 flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                {r.wantedNetwork && <NetworkIcon network={r.wantedNetwork} />}
                <RequestStatusBadge status={r.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={Boolean(open)}
        onOpenChange={(v) => {
          if (!v) {
            setOpenId(null);
            setEdit(null);
          }
        }}
      >
        <SheetContent>
          {open && (
            <>
              <header className="flex items-start justify-between border-b p-4">
                <div className="space-y-1">
                  <SheetTitle>{open.title}</SheetTitle>
                  <RequestStatusBadge status={open.status} />
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {edit ? (
                  <div className="space-y-3">
                    <input
                      className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
                      value={edit.title}
                      onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                      aria-label="Titre"
                    />
                    <textarea
                      className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
                      rows={4}
                      value={edit.description}
                      onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                      aria-label="Description"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate(
                            {
                              id: open.id,
                              patch: { title: edit.title, description: edit.description },
                            },
                            { onSuccess: () => setEdit(null) },
                          )
                        }
                      >
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm">{open.description || '—'}</p>
                    <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Réseau souhaité</dt>
                      <dd>{open.wantedNetwork ? NETWORK_LABELS[open.wantedNetwork] : 'Peu importe'}</dd>
                      <dt className="text-muted-foreground">Échéance</dt>
                      <dd>
                        {open.wantedDate
                          ? new Date(open.wantedDate).toLocaleDateString('fr-FR')
                          : '—'}
                      </dd>
                    </dl>
                    {open.status === 'nouvelle' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEdit({
                            title: open.title,
                            description: open.description,
                            wantedNetwork: open.wantedNetwork ?? '',
                            wantedDate: open.wantedDate ?? '',
                          })
                        }
                      >
                        Modifier
                      </Button>
                    )}
                    {(linked.data ?? []).length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        Votre agence a démarré la production à partir de cette demande.
                      </p>
                    )}
                  </>
                )}

                <div className="border-t pt-4">
                  <RequestComments requestId={open.id} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
