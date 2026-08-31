import { useState } from 'react';
import { Mail, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/EmptyState';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import type { ClientContact } from '@/shared/types';
import {
  useAddClientContact,
  useClientContacts,
  useInviteClientContact,
  useRemoveClientContact,
  useSetContactActive,
} from './useClientContacts';

export function ContactsTab({ clientId }: { clientId: string }) {
  const { data: me } = useCurrentProfile();
  const canWrite = me?.role === 'lead' || me?.role === 'admin';
  const contacts = useClientContacts(clientId);
  const add = useAddClientContact(clientId);
  const invite = useInviteClientContact(clientId);
  const setActive = useSetContactActive(clientId);
  const remove = useRemoveClientContact(clientId);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteOnAdd, setInviteOnAdd] = useState(true);
  const [lastLink, setLastLink] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (inviteOnAdd) {
      const res = await invite.mutateAsync({ fullName: name, email });
      setLastLink(res.actionLink);
    } else {
      await add.mutateAsync({ fullName: name, email });
    }
    setName('');
    setEmail('');
    setAdding(false);
  }

  const rows = contacts.data ?? [];
  const busy = add.isPending || invite.isPending;

  return (
    <div className="max-w-2xl space-y-6">
      {contacts.isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : rows.length === 0 && !adding ? (
        <EmptyState
          title="Aucun contact de validation"
          description="Ajoutez la ou les personnes côté client qui approuveront les posts. Vous pouvez leur créer un accès à l'espace client."
          action={
            canWrite ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Ajouter un contact
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="pb-2 font-medium">Nom</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Accès</th>
                <th className="pb-2 font-medium">Statut</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  canWrite={canWrite}
                  onToggleActive={() => setActive.mutate({ id: c.id, isActive: !c.isActive })}
                  onInvite={async () => {
                    const res = await invite.mutateAsync({ fullName: c.fullName, email: c.email });
                    setLastLink(res.actionLink);
                  }}
                  onRemove={() => {
                    if (confirm(`Supprimer le contact ${c.email} ?`)) remove.mutate(c.id);
                  }}
                  inviting={invite.isPending}
                />
              ))}
            </tbody>
          </table>
          {canWrite && !adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Ajouter un contact
            </Button>
          )}
        </div>
      )}

      {lastLink && (
        <div className="surface-card space-y-2 p-4 text-sm">
          <p className="font-medium">Lien de définition du mot de passe</p>
          <p className="text-muted-foreground">
            Aucun email n'est envoyé : transmettez ce lien au contact.
          </p>
          <code className="bg-background block overflow-x-auto rounded p-2 text-xs">
            {lastLink}
          </code>
          <Button size="sm" variant="ghost" onClick={() => setLastLink(null)}>
            Masquer
          </Button>
        </div>
      )}

      {adding && (
        <form onSubmit={submit} className="surface-card space-y-3 p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="cc-name">Nom</Label>
              <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="cc-email">Email</Label>
              <Input
                id="cc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inviteOnAdd}
              onChange={(e) => setInviteOnAdd(e.target.checked)}
            />
            Créer un accès à l'espace client (affiche un lien à transmettre)
          </label>

          {(add.isError || invite.isError) && (
            <p className="text-destructive text-sm" role="alert">
              {String((add.error ?? invite.error) instanceof Error ? (add.error ?? invite.error) : '') ||
                "L'enregistrement a échoué."}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? 'Enregistrement…' : inviteOnAdd ? 'Ajouter et inviter' : 'Ajouter'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAdding(false);
                setName('');
                setEmail('');
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

function ContactRow({
  contact: c,
  canWrite,
  onToggleActive,
  onInvite,
  onRemove,
  inviting,
}: {
  contact: ClientContact;
  canWrite: boolean;
  onToggleActive: () => void;
  onInvite: () => void;
  onRemove: () => void;
  inviting: boolean;
}) {
  return (
    <tr className="border-t">
      <td className="py-2">{c.fullName || <span className="text-muted-foreground">—</span>}</td>
      <td className="py-2">{c.email}</td>
      <td className="py-2">
        {c.authUserId ? (
          'Compte actif'
        ) : canWrite ? (
          <Button variant="ghost" size="sm" onClick={onInvite} disabled={inviting}>
            <Mail className="h-3.5 w-3.5" /> Inviter
          </Button>
        ) : (
          <span className="text-muted-foreground">Sans accès</span>
        )}
      </td>
      <td className="py-2">
        {c.isActive ? 'Actif' : <span className="text-muted-foreground">Désactivé</span>}
      </td>
      <td className="py-2 text-right">
        {canWrite && (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={onToggleActive}>
              {c.isActive ? 'Désactiver' : 'Activer'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-danger-surface hover:text-danger-strong"
              aria-label={`Supprimer ${c.email}`}
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
