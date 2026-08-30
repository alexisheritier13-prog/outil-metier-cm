import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addOnboardingItem,
  listOnboardingItems,
  removeOnboardingItem,
  reorderOnboardingItems,
  setOnboardingItemDone,
} from '@/services/onboarding';
import { onboardingKey } from './onboardingKeys';

export function OnboardingTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: onboardingKey(clientId), queryFn: () => listOnboardingItems(clientId) });
  const invalidate = () => qc.invalidateQueries({ queryKey: onboardingKey(clientId) });

  const toggle = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) => setOnboardingItemDone(id, isDone),
    onSuccess: invalidate,
  });
  const add = useMutation({
    mutationFn: (label: string) =>
      addOnboardingItem(clientId, label, (items.data?.length ?? 0)),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeOnboardingItem(id),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderOnboardingItems(ids),
    onSuccess: invalidate,
  });

  const [label, setLabel] = useState('');

  if (items.isLoading) return <p className="text-muted-foreground text-sm">Chargement…</p>;

  const rows = items.data ?? [];
  const done = rows.filter((r) => r.isDone).length;

  function move(index: number, delta: number) {
    const next = [...rows];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate(next.map((r) => r.id));
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-muted-foreground text-sm">
        Avancement : <span className="text-foreground font-medium">{done}/{rows.length}</span>
      </p>

      <ul className="divide-y rounded-md border">
        {rows.map((item, i) => (
          <li key={item.id} className="flex items-center gap-3 p-2">
            <input
              type="checkbox"
              checked={item.isDone}
              onChange={() => toggle.mutate({ id: item.id, isDone: !item.isDone })}
              aria-label={item.label}
            />
            <span className={item.isDone ? 'text-muted-foreground flex-1 line-through' : 'flex-1'}>
              {item.label}
            </span>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Monter"
                disabled={i === 0 || reorder.isPending}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Descendre"
                disabled={i === rows.length - 1 || reorder.isPending}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Supprimer « ${item.label} »`}
                onClick={() => remove.mutate(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-muted-foreground p-3 text-sm">Aucune étape.</li>
        )}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          add.mutate(label);
          setLabel('');
        }}
      >
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ajouter une étape…"
          aria-label="Nouvelle étape d'onboarding"
        />
        <Button type="submit" disabled={add.isPending}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>
    </div>
  );
}
