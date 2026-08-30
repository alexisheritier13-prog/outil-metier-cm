import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Profile } from '@/shared/types';
import { useAssignableClients, useSetUserClients, useUserClientIds } from './useUsersAdmin';

interface Props {
  user: Profile | null;
  onClose: () => void;
}

export function AssignClientsDialog({ user, onClose }: Props) {
  const clients = useAssignableClients();
  const current = useUserClientIds(user?.id ?? null);
  const save = useSetUserClients();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (current.data) setSelected(new Set(current.data));
  }, [current.data]);

  const open = user !== null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clients assignés — {user?.fullName || user?.email}</DialogTitle>
        </DialogHeader>

        {clients.isLoading || current.isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {(clients.data ?? []).map((c) => (
              <label key={c.id} className="hover:bg-muted flex items-center gap-2 rounded p-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
                {c.name}
                {c.isArchived && <span className="text-muted-foreground text-xs">(archivé)</span>}
              </label>
            ))}
            {(clients.data ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm">Aucun client pour le moment.</p>
            )}
          </div>
        )}

        {save.isError && (
          <p className="text-destructive text-sm" role="alert">
            L'enregistrement a échoué.
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={save.isPending || !user}
            onClick={async () => {
              if (!user) return;
              await save.mutateAsync({ id: user.id, clientIds: [...selected] });
              onClose();
            }}
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
