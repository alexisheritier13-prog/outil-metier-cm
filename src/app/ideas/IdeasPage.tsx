import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lightbulb, Plus, Trash2, X } from 'lucide-react';
import { listPostsByOrigin } from '@/services/postOrigin';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { textareaClass } from '@/components/form';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { listClients } from '@/services/clients';
import type { Idea } from '@/shared/types';
import {
  useCreateIdea,
  useDeleteIdea,
  useIdeaToPost,
  useIdeas,
  useUpdateIdea,
} from './useIdeas';

export function IdeasPage() {
  const { data: me } = useCurrentProfile();
  const [q, setQ] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('open');
    if (id) {
      setOpenId(id);
      searchParams.delete('open');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const clients = useQuery({
    queryKey: ['clients', { includeArchived: false }],
    queryFn: () => listClients(false),
  });
  const ideas = useIdeas({
    q: q.trim() || undefined,
    clientId: clientFilter === 'none' ? null : clientFilter || undefined,
  });

  const clientName = useMemo(() => {
    const m = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? '—') : 'Sans client');
  }, [clients.data]);

  const open = (ideas.data ?? []).find((i) => i.id === openId) ?? null;

  if (!me || !isInternalRole(me.role)) return null;
  if (ideas.isLoading || clients.isLoading) return <FullPageSpinner />;

  return (
    <Page>
      <PageHeader
        title="Banque d'idées"
        description="Des idées non datées, à transformer en posts quand le moment vient."
        actions={
          <Button onClick={() => setCreating((v) => !v)}>
            <Plus className="h-4 w-4" /> Nouvelle idée
          </Button>
        }
      />

      {creating && (
        <IdeaForm
          clients={clients.data ?? []}
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="field"
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher une idée"
        />
        <select
          className="field"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          aria-label="Filtrer par client"
        >
          <option value="">Tous</option>
          <option value="none">Sans client</option>
          {(clients.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {(ideas.data ?? []).length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Aucune idée"
          description="Notez ici toute inspiration : elle attendra le bon créneau."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(ideas.data ?? []).map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => setOpenId(i.id)}
                className="hover:bg-surface-2/60 flex h-full w-full flex-col gap-1 rounded-xl border p-3 text-left shadow-xs"
              >
                <span className="font-medium">{i.title}</span>
                <span className="text-muted-foreground line-clamp-2 text-sm">
                  {i.description || '—'}
                </span>
                <span className="text-muted-foreground mt-auto pt-2 text-xs">
                  {clientName(i.clientId)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <IdeaSheet
        idea={open}
        clients={clients.data ?? []}
        clientName={clientName}
        onClose={() => setOpenId(null)}
      />
    </Page>
  );
}

function IdeaForm({
  clients,
  idea,
  onDone,
  onCancel,
}: {
  clients: { id: string; name: string }[];
  idea?: Idea;
  onDone: () => void;
  onCancel: () => void;
}) {
  const create = useCreateIdea();
  const update = useUpdateIdea(idea?.id ?? '');

  const [title, setTitle] = useState(idea?.title ?? '');
  const [description, setDescription] = useState(idea?.description ?? '');
  const [clientId, setClientId] = useState(idea?.clientId ?? '');

  const pending = create.isPending || update.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const input = {
      title,
      description,
      clientId: clientId || null,
    };
    const m = idea ? update : create;
    m.mutate(input, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="surface-card mb-6 space-y-3 p-4">
      <input
        className="field w-full"
        placeholder="Titre de l'idée"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Titre"
      />
      <textarea
        className={textareaClass}
        rows={3}
        placeholder="Description, angle, référence…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Description"
      />
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Client</span>
          <select
            className="field"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Sans client (transverse)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !title.trim()}>
          {idea ? 'Enregistrer' : 'Créer'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function IdeaSheet({
  idea,
  clients,
  clientName,
  onClose,
}: {
  idea: Idea | null;
  clients: { id: string; name: string }[];
  clientName: (id: string | null) => string;
  onClose: () => void;
}) {
  const del = useDeleteIdea();
  const toPost = useIdeaToPost();
  const [editing, setEditing] = useState(false);
  const [targetClient, setTargetClient] = useState('');
  const [network, setNetwork] = useState<Network>('instagram');
  const linked = useQuery({
    queryKey: ['posts-by-origin', 'idea', idea?.id],
    queryFn: () => listPostsByOrigin('idea', idea!.id),
    enabled: Boolean(idea),
  });

  if (!idea) return null;
  const needsClient = !idea.clientId;

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <header className="flex items-start justify-between border-b p-4">
          <div className="space-y-1">
            <SheetTitle>{idea.title}</SheetTitle>
            <p className="text-muted-foreground text-sm">{clientName(idea.clientId)}</p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {editing ? (
            <IdeaForm
              clients={clients}
              idea={idea}
              onDone={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <p className="whitespace-pre-wrap text-sm">{idea.description || '—'}</p>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Modifier
              </Button>

              <div className="space-y-2 border-t pt-4">
                <p className="text-muted-foreground text-xs font-medium">Transformer en post</p>
                {needsClient && (
                  <select
                    className="field w-full"
                    value={targetClient}
                    onChange={(e) => setTargetClient(e.target.value)}
                    aria-label="Client du post"
                  >
                    <option value="">Choisir un client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  className="field w-full"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as Network)}
                  aria-label="Réseau"
                >
                  {NETWORKS.map((n) => (
                    <option key={n} value={n}>
                      {NETWORK_LABELS[n]}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={toPost.isPending || (needsClient && !targetClient)}
                  onClick={() =>
                    toPost.mutate(
                      { id: idea.id, clientId: targetClient || undefined, network },
                      { onSuccess: onClose },
                    )
                  }
                >
                  Créer le brouillon
                </Button>
                {toPost.isError && (
                  <p className="text-destructive text-xs">{(toPost.error as Error).message}</p>
                )}
              </div>

              {(linked.data ?? []).length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-muted-foreground text-xs font-medium">Posts générés</p>
                  <ul className="mt-1 list-disc pl-4 text-sm">
                    {(linked.data ?? []).map((p) => (
                      <li key={p.id}>{p.caption.split('\n')[0] || 'Sans légende'}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="border-t p-4">
          <Button
            variant="ghost"
            className="text-danger-strong hover:bg-danger-surface hover:text-danger-strong"
            onClick={() => {
              if (confirm('Supprimer définitivement cette idée ?')) {
                del.mutate(idea.id, { onSuccess: onClose });
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
