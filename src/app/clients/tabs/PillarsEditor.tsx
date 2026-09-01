import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  listClientPillars,
  saveClientPillars,
  type PillarInput,
} from '@/services/clientPillars';

export function PillarsEditor({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['client-pillars', clientId],
    queryFn: () => listClientPillars(clientId),
  });
  const [rows, setRows] = useState<PillarInput[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      setRows(query.data.map((p) => ({ id: p.id, label: p.label, targetPct: p.targetPct })));
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => saveClientPillars(clientId, rows),
    onSuccess: (list) => {
      qc.setQueryData(['client-pillars', clientId], list);
      setSaved(true);
    },
  });

  const totalTarget = rows.reduce((s, r) => s + (Number(r.targetPct) || 0), 0);

  return (
    <section className="max-w-2xl space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Rubriques de contenu</h3>
        <p className="text-muted-foreground text-xs">
          Types de posts et part cible sur un mois (produit, coulisses, UGC…). La jauge
          d'équilibre s'affiche sur la fiche.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id ?? i} className="flex items-center gap-2">
            <Input
              aria-label={`Rubrique ${i + 1}`}
              className="flex-1"
              placeholder="Produit"
              value={r.label}
              onChange={(e) =>
                setRows(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <div className="flex items-center gap-1">
              <Input
                aria-label={`Cible % rubrique ${i + 1}`}
                type="number"
                min={0}
                max={100}
                className="w-16"
                value={r.targetPct}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, targetPct: Number(e.target.value) || 0 } : x,
                    ),
                  )
                }
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Retirer la rubrique ${i + 1}`}
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows([...rows, { label: '', targetPct: 0 }])}
        >
          <Plus className="h-4 w-4" /> Ajouter une rubrique
        </Button>
      </div>

      {rows.length > 0 && (
        <p
          className={cn(
            'text-xs',
            totalTarget === 100 ? 'text-success-strong' : 'text-warning-strong',
          )}
        >
          Total des cibles : {totalTarget}%{totalTarget !== 100 && ' (idéalement 100 %)'}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={save.isPending}
          onClick={() => {
            setSaved(false);
            save.mutate();
          }}
        >
          Enregistrer les rubriques
        </Button>
        {saved && !save.isPending && (
          <span className="text-success-strong inline-flex items-center gap-1 text-sm" role="status">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Enregistré
          </span>
        )}
      </div>
    </section>
  );
}
