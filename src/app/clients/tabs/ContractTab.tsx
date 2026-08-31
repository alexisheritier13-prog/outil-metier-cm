import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getClientContract,
  saveClientContract,
  type ClientContractInput,
} from '@/services/clientContract';

const TEXT_FIELDS: { key: keyof Omit<ClientContractInput, 'startDate'>; label: string; hint: string; rows: number }[] = [
  {
    key: 'scope',
    label: 'Ce qu’on livre',
    hint: 'Le périmètre : nombre de posts, stories, reels, community management, reporting…',
    rows: 5,
  },
  { key: 'cadence', label: 'Rythme', hint: 'Fréquence de publication, jours, temps de réponse.', rows: 2 },
  { key: 'channels', label: 'Réseaux couverts', hint: 'Les comptes gérés dans le cadre de la prestation.', rows: 2 },
  { key: 'notes', label: 'Conditions', hint: 'Durée, reconduction, points d’attention, hors périmètre.', rows: 4 },
];

export function ContractTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['client-contract', clientId],
    queryFn: () => getClientContract(clientId),
  });
  const save = useMutation({
    mutationFn: (input: ClientContractInput) => saveClientContract(clientId, input),
    onSuccess: (c) => {
      qc.setQueryData(['client-contract', clientId], c);
      setJustSaved(true);
    },
  });

  const [form, setForm] = useState<ClientContractInput>({
    scope: '',
    cadence: '',
    channels: '',
    startDate: null,
    notes: '',
  });
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      const d = query.data;
      setForm({
        scope: d.scope,
        cadence: d.cadence,
        channels: d.channels,
        startDate: d.startDate,
        notes: d.notes,
      });
    }
  }, [query.data]);

  if (query.isLoading) return <p className="text-muted-foreground text-sm">Chargement…</p>;

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setJustSaved(false);
        save.mutate(form);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ct-start">Début de la prestation</Label>
        <Input
          id="ct-start"
          type="date"
          className="w-44"
          value={form.startDate ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value || null }))}
        />
      </div>

      {TEXT_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`ct-${f.key}`}>{f.label}</Label>
          <p className="text-muted-foreground text-xs">{f.hint}</p>
          <textarea
            id={`ct-${f.key}`}
            rows={f.rows}
            className="border-input bg-surface focus-visible:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
            value={form[f.key]}
            onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
          />
        </div>
      ))}

      {save.isError && (
        <p className="text-destructive text-sm" role="alert">
          L'enregistrement a échoué.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        {justSaved && !save.isPending && (
          <span className="text-success-strong inline-flex items-center gap-1 text-sm" role="status">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Enregistré
          </span>
        )}
      </div>
    </form>
  );
}
