import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormBody,
  FormField,
  FormFooter,
  FormSection,
  selectClass,
  textareaClass,
} from '@/components/form';
import { cn } from '@/lib/utils';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { parisDateLabel } from '@/shared/utils/tz';
import type { Client, PostTemplate, Profile } from '@/shared/types';
import { listClientPillars } from '@/services/clientPillars';
import { seriesDates, type SeriesConfig } from './series';
import { templatePrefill } from './applyTemplate';

const DAYS: { v: number; label: string }[] = [
  { v: 1, label: 'Lun' },
  { v: 2, label: 'Mar' },
  { v: 3, label: 'Mer' },
  { v: 4, label: 'Jeu' },
  { v: 5, label: 'Ven' },
  { v: 6, label: 'Sam' },
  { v: 0, label: 'Dim' },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface SeriesResult {
  dates: string[];
  clientId: string;
  network: Network;
  caption: string;
  authorId?: string;
  pillarId: string | null;
}

interface Props {
  clients: Client[];
  templates: PostTemplate[];
  authors?: Profile[];
  canReassign?: boolean;
  pending: boolean;
  report?: { created: number; total: number } | null;
  onSubmit: (r: SeriesResult) => void;
  onCancel: () => void;
}

export function SeriesForm({
  clients,
  templates,
  authors = [],
  canReassign = false,
  pending,
  report,
  onSubmit,
  onCancel,
}: Props) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [network, setNetwork] = useState<Network>('instagram');
  const [caption, setCaption] = useState('');
  const [pillarId, setPillarId] = useState('');
  const [authorId, setAuthorId] = useState<string | undefined>(undefined);

  const pillars = useQuery({
    queryKey: ['client-pillars', clientId],
    queryFn: () => listClientPillars(clientId),
    enabled: Boolean(clientId),
  });

  const [startDate, setStartDate] = useState(todayISO());
  const [weekdays, setWeekdays] = useState<number[]>([2, 4]);
  const [time, setTime] = useState('10:00');
  const [mode, setMode] = useState<'count' | 'until'>('count');
  const [count, setCount] = useState(8);
  const [until, setUntil] = useState('');

  const applicable = templates.filter((t) => t.clientId === null || t.clientId === clientId);

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const pre = templatePrefill(t);
    if (pre.network) setNetwork(pre.network);
    if (pre.caption) setCaption(pre.caption);
  }

  const cfg: SeriesConfig = { startDate, weekdays, time, mode, count, until };
  const dates = useMemo(() => seriesDates(cfg), [startDate, weekdays.join(','), time, mode, count, until]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (v: number) =>
    setWeekdays((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v].sort()));

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (dates.length === 0) return;
        onSubmit({
          dates,
          clientId,
          network,
          caption,
          pillarId: pillarId || null,
          authorId: canReassign ? authorId : undefined,
        });
      }}
    >
      <FormBody>
        <FormSection title="Contenu">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Client" htmlFor="sr-client">
              <select
                id="sr-client"
                className={selectClass}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Réseau" htmlFor="sr-network">
              <select
                id="sr-network"
                className={selectClass}
                value={network}
                onChange={(e) => setNetwork(e.target.value as Network)}
              >
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {NETWORK_LABELS[n]}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {applicable.length > 0 && (
            <FormField label="Partir d'un template" htmlFor="sr-template">
              <select
                id="sr-template"
                className={selectClass}
                defaultValue=""
                onChange={(e) => {
                  applyTemplate(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">— Aucun —</option>
                {applicable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField
            label="Légende"
            htmlFor="sr-caption"
            hint="Appliquée à tous les posts de la série ; à ajuster ensuite un par un."
          >
            <textarea
              id="sr-caption"
              rows={4}
              className={textareaClass}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            {(pillars.data ?? []).length > 0 && (
              <FormField label="Rubrique" htmlFor="sr-pillar">
                <select
                  id="sr-pillar"
                  className={selectClass}
                  value={pillarId}
                  onChange={(e) => setPillarId(e.target.value)}
                >
                  <option value="">Non classé</option>
                  {(pillars.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

          {canReassign && authors.length > 0 && (
            <FormField label="Rédacteur" htmlFor="sr-author">
              <select
                id="sr-author"
                className={selectClass}
                value={authorId ?? ''}
                onChange={(e) => setAuthorId(e.target.value || undefined)}
              >
                <option value="">— Par défaut —</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName || a.email}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </FormSection>

        <FormSection title="Rythme">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="À partir du" htmlFor="sr-start">
              <Input
                id="sr-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </FormField>
            <FormField label="Heure" htmlFor="sr-time">
              <Input id="sr-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </FormField>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Jours de publication</span>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  aria-pressed={weekdays.includes(d.v)}
                  onClick={() => toggleDay(d.v)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    weekdays.includes(d.v)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-surface-2',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sr-mode"
                className="accent-primary"
                checked={mode === 'count'}
                onChange={() => setMode('count')}
              />
              Nombre de posts
            </label>
            <Input
              type="number"
              min={1}
              max={60}
              className="w-20"
              value={count}
              disabled={mode !== 'count'}
              onChange={(e) => setCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sr-mode"
                className="accent-primary"
                checked={mode === 'until'}
                onChange={() => setMode('until')}
              />
              Jusqu'au
            </label>
            <Input
              type="date"
              className="w-40"
              value={until}
              disabled={mode !== 'until'}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>

          <div className="bg-surface-2 rounded-lg border p-3 text-sm">
            {dates.length === 0 ? (
              <span className="text-muted-foreground">
                Choisissez au moins un jour {mode === 'until' && 'et une date de fin'}.
              </span>
            ) : (
              <>
                <span className="font-medium">{dates.length} post(s)</span>{' '}
                <span className="text-muted-foreground">
                  — {dates.slice(0, 4).map((d) => parisDateLabel(d)).join(', ')}
                  {dates.length > 4 && `, … ${parisDateLabel(dates[dates.length - 1]!)}`}
                </span>
              </>
            )}
          </div>
        </FormSection>

        {report && (
          <p
            className={cn(
              'text-sm',
              report.created === report.total ? 'text-success-strong' : 'text-warning-strong',
            )}
            role="status"
          >
            {report.created}/{report.total} posts créés en brouillon.
          </p>
        )}
      </FormBody>

      <FormFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Fermer
        </Button>
        <Button type="submit" disabled={pending || dates.length === 0 || clients.length === 0}>
          {pending ? 'Création…' : `Créer ${dates.length || ''} brouillon(s)`}
        </Button>
      </FormFooter>
    </form>
  );
}
