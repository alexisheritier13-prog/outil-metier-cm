import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarHeart, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { listClients } from '@/services/clients';
import {
  createKeyDate,
  deleteKeyDate,
  keyDateToPost,
  listKeyDates,
  updateKeyDate,
  type KeyDateInput,
} from '@/services/keyDates';
import type { KeyDate, KeyDateScope } from '@/shared/types';

const KEY = ['key-dates'];
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const SCOPE_LABELS: Record<KeyDateScope, string> = {
  global: 'Global',
  sector: 'Secteur',
  client: 'Client',
};

export function KeyDatesPage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<KeyDate | 'new' | null>(null);

  const keyDates = useQuery({ queryKey: KEY, queryFn: listKeyDates });
  const clients = useQuery({
    queryKey: ['clients', { includeArchived: false }],
    queryFn: () => listClients(false),
  });
  const del = useMutation({
    mutationFn: deleteKeyDate,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const clientName = (id: string | null) =>
    id ? ((clients.data ?? []).find((c) => c.id === id)?.name ?? '—') : '';

  const byMonth = useMemo(() => {
    const groups: Record<number, KeyDate[]> = {};
    for (const k of keyDates.data ?? []) {
      const m = new Date(k.eventDate).getMonth();
      (groups[m] ??= []).push(k);
    }
    return groups;
  }, [keyDates.data]);

  if (!me || !isInternalRole(me.role)) return null;
  if (keyDates.isLoading || clients.isLoading) return <FullPageSpinner />;

  return (
    <Page>
      <PageHeader
        title="Marronniers"
        description="Les temps forts à anticiper : globaux, par secteur, ou propres à un client."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Nouveau marronnier
          </Button>
        }
      />

      {editing && (
        <KeyDateForm
          keyDate={editing === 'new' ? undefined : editing}
          clients={clients.data ?? []}
          canGlobal={me.role === 'lead' || me.role === 'admin'}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: KEY });
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {(keyDates.data ?? []).length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title="Aucun marronnier"
          description="Ajoutez les dates clés de l'année pour ne rien manquer."
        />
      ) : (
        <div className="space-y-6">
          {MONTHS.map((label, m) =>
            byMonth[m]?.length ? (
              <div key={m}>
                <h2 className="text-section mb-2 capitalize">{label}</h2>
                <ul className="surface-card divide-y overflow-hidden">
                  {byMonth[m]
                    .slice()
                    // tri par mois-jour (l'année stockée est arbitraire pour un marronnier annuel)
                    .sort((a, b) => a.eventDate.slice(5).localeCompare(b.eventDate.slice(5)))
                    .map((k) => (
                      <li key={k.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                        <span className="text-muted-foreground w-10 tabular-nums">
                          {new Date(k.eventDate).getDate()}
                        </span>
                        <span className="font-medium">{k.name}</span>
                        <span className="text-muted-foreground rounded border px-1 text-xs">
                          {SCOPE_LABELS[k.scope]}
                          {k.scope === 'sector' && k.sector ? ` · ${k.sector}` : ''}
                          {k.scope === 'client' ? ` · ${clientName(k.clientId)}` : ''}
                        </span>
                        {k.recurringAnnually && (
                          <span className="text-muted-foreground text-xs">annuel</span>
                        )}
                        <div className="ml-auto flex gap-1">
                          <PlanButton keyDate={k} clients={clients.data ?? []} />
                          <Button size="sm" variant="ghost" onClick={() => setEditing(k)}>
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:bg-danger-surface hover:text-danger-strong"
                            aria-label="Supprimer"
                            onClick={() => {
                              if (confirm(`Supprimer « ${k.name} » ?`)) del.mutate(k.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      )}
    </Page>
  );
}

function PlanButton({
  keyDate,
  clients,
}: {
  keyDate: KeyDate;
  clients: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(keyDate.clientId ?? '');
  const [network, setNetwork] = useState<Network>('instagram');
  const plan = useMutation({
    mutationFn: () =>
      keyDateToPost(keyDate.id, clientId, {
        year: new Date().getFullYear(),
        network,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Planifier
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <select
        className="border-input bg-background h-8 rounded border px-1 text-xs"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        aria-label="Client"
      >
        <option value="">Client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="border-input bg-background h-8 rounded border px-1 text-xs"
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
      <Button size="sm" disabled={!clientId || plan.isPending} onClick={() => plan.mutate()}>
        OK
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        ✕
      </Button>
    </span>
  );
}

function KeyDateForm({
  keyDate,
  clients,
  canGlobal,
  onDone,
  onCancel,
}: {
  keyDate?: KeyDate;
  clients: { id: string; name: string; sector?: string | null }[];
  canGlobal: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(keyDate?.name ?? '');
  const [eventDate, setEventDate] = useState(keyDate?.eventDate ?? '');
  const [recurring, setRecurring] = useState(keyDate?.recurringAnnually ?? true);
  const [scope, setScope] = useState<KeyDateScope>(keyDate?.scope ?? (canGlobal ? 'global' : 'client'));
  const [sector, setSector] = useState(keyDate?.sector ?? '');
  const [clientId, setClientId] = useState(keyDate?.clientId ?? '');
  const [description, setDescription] = useState(keyDate?.description ?? '');

  const save = useMutation({
    mutationFn: (input: KeyDateInput) =>
      keyDate ? updateKeyDate(keyDate.id, input) : createKeyDate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      onDone();
    },
  });

  const valid =
    name.trim() &&
    eventDate &&
    (scope === 'global' || (scope === 'sector' && sector.trim()) || (scope === 'client' && clientId));

  return (
    <form
      className="surface-card mb-6 space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        save.mutate({
          name,
          eventDate,
          recurringAnnually: recurring,
          scope,
          sector: sector || null,
          clientId: clientId || null,
          description,
        });
      }}
    >
      <div className="flex flex-wrap gap-3">
        <input
          className="border-input bg-background flex-1 rounded border px-2 py-1.5 text-sm"
          placeholder="Nom (ex. Fête des mères)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nom"
        />
        <input
          type="date"
          className="field"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          aria-label="Date"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          Chaque année
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Portée</span>
          <select
            className="field"
            value={scope}
            onChange={(e) => setScope(e.target.value as KeyDateScope)}
          >
            {canGlobal && <option value="global">Global</option>}
            {canGlobal && <option value="sector">Secteur</option>}
            <option value="client">Client</option>
          </select>
        </label>
        {scope === 'sector' && (
          <input
            className="field"
            placeholder="Secteur (ex. restauration)"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            aria-label="Secteur"
          />
        )}
        {scope === 'client' && (
          <select
            className="field"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            aria-label="Client"
          >
            <option value="">Choisir…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <textarea
        className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
        rows={2}
        placeholder="Note / angle (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Description"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || !valid}>
          {keyDate ? 'Enregistrer' : 'Créer'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
