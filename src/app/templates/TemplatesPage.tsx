import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { listClients } from '@/services/clients';
import {
  createPostTemplate,
  deletePostTemplate,
  listPostTemplates,
  updatePostTemplate,
  type PostTemplateInput,
} from '@/services/postTemplates';
import type { PostTemplate } from '@/shared/types';

const KEY = ['post-templates'];

export function TemplatesPage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PostTemplate | 'new' | null>(null);

  const templates = useQuery({ queryKey: KEY, queryFn: listPostTemplates });
  const clients = useQuery({
    queryKey: ['clients', { includeArchived: false }],
    queryFn: () => listClients(false),
  });
  const del = useMutation({
    mutationFn: deletePostTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const clientName = useMemo(() => {
    const m = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? '—') : 'Global');
  }, [clients.data]);

  if (!me || !isInternalRole(me.role)) return null;
  if (templates.isLoading || clients.isLoading) return <FullPageSpinner />;

  return (
    <Page>
      <PageHeader
        title="Templates de posts"
        description="Des gabarits réutilisables pour les formats récurrents."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Nouveau template
          </Button>
        }
      />

      {editing && (
        <TemplateForm
          template={editing === 'new' ? undefined : editing}
          clients={clients.data ?? []}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: KEY });
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {(templates.data ?? []).length === 0 ? (
        <EmptyState icon={FileText} title="Aucun template" description="Créez votre premier gabarit." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(templates.data ?? []).map((t) => (
            <li key={t.id} className="rounded-xl border bg-surface p-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {clientName(t.clientId)}
                    {t.network ? ` · ${NETWORK_LABELS[t.network]}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:bg-danger-surface hover:text-danger-strong"
                    aria-label="Supprimer"
                    onClick={() => {
                      if (confirm(`Supprimer le template « ${t.name} » ?`)) del.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {t.description && (
                <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
              )}
              <pre className="bg-surface-2 mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded border p-2 text-xs">
                {t.captionTemplate || '(légende vide)'}
              </pre>
              {t.defaultTags.length > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Tags : {t.defaultTags.join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function TemplateForm({
  template,
  clients,
  onDone,
  onCancel,
}: {
  template?: PostTemplate;
  clients: { id: string; name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [network, setNetwork] = useState<Network | ''>(template?.network ?? '');
  const [caption, setCaption] = useState(template?.captionTemplate ?? '');
  const [tags, setTags] = useState((template?.defaultTags ?? []).join(', '));
  const [clientId, setClientId] = useState(template?.clientId ?? '');

  const save = useMutation({
    mutationFn: (input: PostTemplateInput) =>
      template ? updatePostTemplate(template.id, input) : createPostTemplate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      onDone();
    },
  });

  return (
    <form
      className="surface-card mb-6 space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        save.mutate({
          name,
          description,
          network: network || null,
          captionTemplate: caption,
          defaultTags: tags.split(',').map((s) => s.trim()).filter(Boolean),
          clientId: clientId || null,
        });
      }}
    >
      <input
        className="border-input bg-surface w-full rounded border px-2 py-1.5 text-sm"
        placeholder="Nom du template"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nom"
      />
      <input
        className="border-input bg-surface w-full rounded border px-2 py-1.5 text-sm"
        placeholder="Description courte (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Description"
      />
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Réseau</span>
          <select
            className="field"
            value={network}
            onChange={(e) => setNetwork(e.target.value as Network | '')}
          >
            <option value="">Indifférent</option>
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABELS[n]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Portée</span>
          <select
            className="field"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Global (tous les clients)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted-foreground mb-1 block text-xs">Gabarit de légende</span>
        <textarea
          className="border-input bg-surface w-full rounded border px-2 py-1.5 text-sm"
          rows={5}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>
      <input
        className="border-input bg-surface w-full rounded border px-2 py-1.5 text-sm"
        placeholder="Tags par défaut (séparés par des virgules)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        aria-label="Tags par défaut"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || !name.trim()}>
          {template ? 'Enregistrer' : 'Créer'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
