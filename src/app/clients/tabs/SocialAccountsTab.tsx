import { useState } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/EmptyState';
import { NetworkIcon } from '@/components/NetworkIcon';
import { NETWORKS, type Network } from '@/shared/constants/networks';
import {
  useAddSocialAccount,
  useNetworks,
  useRemoveSocialAccount,
  useSocialAccounts,
} from './useSocialAccounts';

export function SocialAccountsTab({ clientId }: { clientId: string }) {
  const accounts = useSocialAccounts(clientId);
  const networks = useNetworks();
  const add = useAddSocialAccount(clientId);
  const remove = useRemoveSocialAccount(clientId);

  const [network, setNetwork] = useState<Network>('instagram');
  const [handle, setHandle] = useState('');
  const [adding, setAdding] = useState(false);

  const specsFor = (code: Network) => networks.data?.find((n) => n.code === code)?.specs ?? '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    await add.mutateAsync({ network, handle });
    setHandle('');
    setAdding(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {accounts.isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : (accounts.data ?? []).length === 0 && !adding ? (
        <EmptyState
          title="Aucun compte social"
          description="Ajoutez les comptes du client pour pouvoir cibler un réseau précis lors de la création d'un post."
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Ajouter un compte
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="pb-2 font-medium">Réseau</th>
                <th className="pb-2 font-medium">Identifiant</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {(accounts.data ?? []).map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="py-2">
                    <NetworkIcon network={a.network} withLabel />
                  </td>
                  <td className="py-2">{a.handle}</td>
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-danger-surface hover:text-danger-strong"
                      aria-label={`Supprimer ${a.handle}`}
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm(`Supprimer le compte ${a.handle} (${a.network}) ?`)) {
                          remove.mutate(a.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Ajouter un compte
            </Button>
          )}
        </div>
      )}

      {adding && (
        <form onSubmit={submit} className="bg-surface-2 space-y-3 rounded-md border p-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sa-network">Réseau</Label>
              <select
                id="sa-network"
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                value={network}
                onChange={(e) => setNetwork(e.target.value as Network)}
              >
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {networks.data?.find((x) => x.code === n)?.label ?? n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="sa-handle">Identifiant / nom du compte</Label>
              <Input
                id="sa-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@studiolumen"
                autoComplete="off"
              />
            </div>
          </div>

          {specsFor(network) && (
            <p className="text-muted-foreground flex gap-1.5 text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {specsFor(network)}
            </p>
          )}

          {add.isError && (
            <p className="text-destructive text-sm" role="alert">
              {/(duplicate|unique)/i.test(String(add.error))
                ? 'Ce compte est déjà enregistré.'
                : "L'ajout a échoué."}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={add.isPending}>
              {add.isPending ? 'Ajout…' : 'Ajouter'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAdding(false);
                setHandle('');
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
