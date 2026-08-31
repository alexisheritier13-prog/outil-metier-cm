import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BrandColor } from '@/shared/types';
import {
  getEditorialGuideline,
  saveEditorialGuideline,
  type EditorialGuidelineInput,
} from '@/services/editorialGuidelines';

const TEXT_FIELDS: {
  key: Exclude<keyof EditorialGuidelineInput, 'brandColors' | 'typography'>;
  label: string;
  hint: string;
  rows: number;
}[] = [
  { key: 'tone', label: 'Ton de voix', hint: 'Comment le client s’exprime : registre, personnalité, ce qu’il n’est pas.', rows: 3 },
  { key: 'wordsToAvoid', label: 'Mots / expressions à éviter', hint: 'Un par ligne.', rows: 3 },
  { key: 'wordsToPrefer', label: 'Mots / expressions à privilégier', hint: 'Un par ligne.', rows: 3 },
  { key: 'goodExamples', label: 'Exemples de bons posts', hint: 'Copier-coller de posts qui incarnent la charte.', rows: 5 },
  { key: 'visualGuidelines', label: 'Direction artistique', hint: 'Style d’image, cadrage, retouche, ce qu’on évite.', rows: 4 },
];

const HEX_RE = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const normHex = (v: string) => {
  const t = v.trim();
  return t && !t.startsWith('#') && HEX_RE.test(t) ? `#${t}` : t;
};

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
    brandColors: [],
    typography: '',
  });
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      const d = query.data;
      setForm({
        tone: d.tone,
        wordsToAvoid: d.wordsToAvoid,
        wordsToPrefer: d.wordsToPrefer,
        goodExamples: d.goodExamples,
        visualGuidelines: d.visualGuidelines,
        brandColors: d.brandColors,
        typography: d.typography,
      });
    }
  }, [query.data]);

  if (query.isLoading) return <p className="text-muted-foreground text-sm">Chargement…</p>;

  const setColors = (brandColors: BrandColor[]) => setForm((p) => ({ ...p, brandColors }));

  return (
    <form
      className="max-w-2xl space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        setJustSaved(false);
        save.mutate({
          ...form,
          brandColors: form.brandColors.map((c) => ({ ...c, hex: normHex(c.hex) })),
        });
      }}
    >
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Charte éditoriale</h3>
        {TEXT_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`eg-${f.key}`}>{f.label}</Label>
            <p className="text-muted-foreground text-xs">{f.hint}</p>
            <textarea
              id={`eg-${f.key}`}
              rows={f.rows}
              className="border-input bg-surface focus-visible:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
              value={form[f.key]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Charte graphique</h3>
          <p className="text-muted-foreground text-xs">Couleurs et typographies de la marque.</p>
        </div>

        <div className="space-y-2">
          <Label>Couleurs</Label>
          <div className="space-y-2">
            {form.brandColors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="border-border h-9 w-9 shrink-0 rounded-lg border"
                  style={{ backgroundColor: HEX_RE.test(c.hex) ? normHex(c.hex) : 'transparent' }}
                  aria-hidden="true"
                />
                <Input
                  aria-label={`Code couleur ${i + 1}`}
                  className="w-32 font-mono"
                  placeholder="#1B4D3E"
                  value={c.hex}
                  onChange={(e) =>
                    setColors(form.brandColors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))
                  }
                />
                <Input
                  aria-label={`Nom couleur ${i + 1}`}
                  className="flex-1"
                  placeholder="Vert principal"
                  value={c.label}
                  onChange={(e) =>
                    setColors(
                      form.brandColors.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer la couleur ${i + 1}`}
                  onClick={() => setColors(form.brandColors.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setColors([...form.brandColors, { hex: '', label: '' }])}
            >
              <Plus className="h-4 w-4" /> Ajouter une couleur
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="eg-typography">Typographies</Label>
          <p className="text-muted-foreground text-xs">
            Titres, corps de texte, règles d’usage. Une police par ligne, ou du texte libre.
          </p>
          <textarea
            id="eg-typography"
            rows={3}
            className="border-input bg-surface focus-visible:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
            placeholder={'Titres : Montserrat Bold\nCorps : Inter Regular'}
            value={form.typography}
            onChange={(e) => setForm((p) => ({ ...p, typography: e.target.value }))}
          />
        </div>
      </section>

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
