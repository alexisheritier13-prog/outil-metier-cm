import { useState } from 'react';
import { Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/EmptyState';
import type { ClientCredential } from '@/shared/types';
import type { ClientCredentialInput } from '@/services/clientCredentials';
import {
  useAddCredential,
  useClientCredentials,
  useDeleteCredential,
  useUpdateCredential,
} from './useClientCredentials';

const EMPTY: ClientCredentialInput = { label: '', login: '', secret: '', url: '', notes: '' };

export function CredentialsTab({ clientId }: { clientId: string }) {
  const list = useClientCredentials(clientId);
  const add = useAddCredential(clientId);
  const [adding, setAdding] = useState(false);

  if (list.isLoading) return <p className="text-muted-foreground text-sm">Chargement…</p>;

  const rows = list.data ?? [];

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-muted-foreground text-sm">
        Codes de connexion des comptes du client. Visibles uniquement par l’équipe interne, jamais
        par le client.
      </p>

      {rows.length === 0 && !adding ? (
        <EmptyState
          title="Aucun accès enregistré"
          description="Ajoutez les identifiants des comptes réseaux, du site, des outils…"
          action={
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Ajouter un accès
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <CredentialCard key={c.id} clientId={clientId} credential={c} />
          ))}

          {adding && (
            <DraftCard
              pending={add.isPending}
              error={add.isError}
              onCancel={() => setAdding(false)}
              onSave={async (input) => {
                await add.mutateAsync(input);
                setAdding(false);
              }}
            />
          )}

          {!adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Ajouter un accès
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CredentialCard({ clientId, credential }: { clientId: string; credential: ClientCredential }) {
  const update = useUpdateCredential(clientId);
  const remove = useDeleteCredential(clientId);
  const [form, setForm] = useState<ClientCredentialInput>({
    label: credential.label,
    login: credential.login,
    secret: credential.secret,
    url: credential.url,
    notes: credential.notes,
  });

  const dirty =
    form.label !== credential.label ||
    form.login !== credential.login ||
    form.secret !== credential.secret ||
    form.url !== credential.url ||
    form.notes !== credential.notes;

  return (
    <Fields
      value={form}
      onChange={setForm}
      footer={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={!dirty || update.isPending}
            onClick={() => update.mutate({ id: credential.id, input: form })}
          >
            {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-danger-surface hover:text-danger-strong"
            aria-label={`Supprimer ${credential.label || 'cet accès'}`}
            onClick={() => {
              if (confirm(`Supprimer l’accès « ${credential.label || 'sans nom'} » ?`))
                remove.mutate(credential.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {update.isError && (
            <span className="text-danger-strong text-xs" role="alert">
              Échec
            </span>
          )}
        </div>
      }
    />
  );
}

function DraftCard({
  pending,
  error,
  onSave,
  onCancel,
}: {
  pending: boolean;
  error: boolean;
  onSave: (input: ClientCredentialInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ClientCredentialInput>(EMPTY);
  return (
    <Fields
      value={form}
      onChange={setForm}
      footer={
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending || !form.label.trim()} onClick={() => onSave(form)}>
            {pending ? 'Ajout…' : 'Ajouter'}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Annuler
          </Button>
          {error && (
            <span className="text-danger-strong text-xs" role="alert">
              Échec
            </span>
          )}
        </div>
      }
    />
  );
}

function Fields({
  value,
  onChange,
  footer,
}: {
  value: ClientCredentialInput;
  onChange: (v: ClientCredentialInput) => void;
  footer: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const set = (patch: Partial<ClientCredentialInput>) => onChange({ ...value, ...patch });

  return (
    <div className="surface-card space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Compte</Label>
          <Input
            placeholder="Instagram, Site WordPress, Canva…"
            value={value.label}
            onChange={(e) => set({ label: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">URL de connexion</Label>
          <Input
            placeholder="https://…"
            value={value.url}
            onChange={(e) => set({ url: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Identifiant</Label>
          <div className="flex gap-1.5">
            <Input value={value.login} onChange={(e) => set({ login: e.target.value })} />
            <CopyButton text={value.login} label="Copier l’identifiant" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mot de passe</Label>
          <div className="flex gap-1.5">
            <Input
              type={show ? 'text' : 'password'}
              value={value.secret}
              onChange={(e) => set({ secret: e.target.value })}
              className="font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={show ? 'Masquer' : 'Afficher'}
              onClick={() => setShow((v) => !v)}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <CopyButton text={value.secret} label="Copier le mot de passe" />
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input
          placeholder="2FA sur le tel de Chris, compte partagé…"
          value={value.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
      {footer}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* presse-papiers indisponible */
        }
      }}
    >
      {done ? <span className="text-success-strong text-xs">ok</span> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
