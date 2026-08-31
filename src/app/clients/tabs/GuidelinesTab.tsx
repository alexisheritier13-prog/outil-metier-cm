import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  getEditorialGuideline,
  saveEditorialGuideline,
  type EditorialGuidelineInput,
} from '@/services/editorialGuidelines';

const FIELDS: { key: keyof EditorialGuidelineInput; label: string; hint: string; rows: number }[] = [
  { key: 'tone', label: 'Ton de voix', hint: 'Comment le client s’exprime : registre, personnalité, ce qu’il n’est pas.', rows: 3 },
  { key: 'wordsToAvoid', label: 'Mots / expressions à éviter', hint: 'Un par ligne.', rows: 3 },
  { key: 'wordsToPrefer', label: 'Mots / expressions à privilégier', hint: 'Un par ligne.', rows: 3 },
  { key: 'goodExamples', label: 'Exemples de bons posts', hint: 'Copier-coller de posts qui incarnent la charte.', rows: 5 },
  { key: 'visualGuidelines', label: 'Guidelines visuelles', hint: 'Couleurs, polices, style d’image — informatif, aucun fichier géré ici.', rows: 4 },
];

export function GuidelinesTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['editorial-guideline', clientId],
    queryFn: () => getEditorialGuideline(clientId),
  });
  const save = useMutation({
    mutationFn: (input: EditorialGuidelineInput) => saveEditorialGuideline(clientId, input),
    onSuccess: (g) => {
      qc.setQueryData(['editorial-guideline', clientId], g);
      setJustSaved(true);
    },
  });

  const [form, setForm] = useState<EditorialGuidelineInput>({
    tone: '',
    wordsToAvoid: '',
    wordsToPrefer: '',
    goodExamples: '',
    visualGuidelines: '',
  });
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      setForm({
        tone: query.data.tone,
        wordsToAvoid: query.data.wordsToAvoid,
        wordsToPrefer: query.data.wordsToPrefer,
        goodExamples: query.data.goodExamples,
        visualGuidelines: query.data.visualGuidelines,
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
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`eg-${f.key}`}>{f.label}</Label>
          <p className="text-muted-foreground text-xs">{f.hint}</p>
          <textarea
            id={`eg-${f.key}`}
            rows={f.rows}
            className="border-input bg-surface focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
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
          {save.isPending ? 'Enregistrement…' : 'Enregistrer la charte'}
        </Button>
        {justSaved && !save.isPending && (
          <span className="text-success-strong inline-flex items-center gap-1 text-sm" role="status">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  );
}
