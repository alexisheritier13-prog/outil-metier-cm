import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, Copy, Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { Page, PageHeader } from '@/components/Page';
import { EmptyState } from '@/components/EmptyState';
import {
  FormBody,
  FormField,
  FormFooter,
  FormSection,
  FormSheet,
} from '@/components/form';
import { cn } from '@/lib/utils';
import { parisDateLabel } from '@/shared/utils/tz';
import { invitationUrl } from '@/services/platform';
import { FEEDBACK_KIND_LABELS, type FeedbackStatus } from '@/services/feedback';
import {
  useCreateInvitation,
  useIsPlatformAdmin,
  usePlatformFeedback,
  usePlatformInvitations,
  usePlatformOrgs,
  useSetFeedbackStatus,
} from './usePlatform';

export function PlatformPage() {
  const admin = useIsPlatformAdmin();
  const orgs = usePlatformOrgs(admin.data === true);
  const invites = usePlatformInvitations(admin.data === true);
  const feedback = usePlatformFeedback(admin.data === true);
  const setFbStatus = useSetFeedbackStatus();
  const create = useCreateInvitation();

  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  if (admin.isLoading) return <FullPageSpinner />;
  if (admin.data !== true) return <Navigate to="/app" replace />;

  const pending = (invites.data ?? []).filter((i) => !i.accepted && !i.expired);

  async function copy(token: string) {
    await navigator.clipboard.writeText(invitationUrl(token));
    setCopied(token);
    setTimeout(() => setCopied((c) => (c === token ? null : c)), 1800);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;
    create.mutate(
      { orgName, email: email.trim() || undefined },
      {
        onSuccess: () => {
          setOrgName('');
          setEmail('');
          setOpen(false);
        },
      },
    );
  }

  return (
    <Page>
      <PageHeader
        title="Admin plateforme"
        description="Inviter des agences sur Cadence et suivre les inscriptions."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Générer une invitation
          </Button>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Liens d'invitation actifs</h2>
        {pending.length === 0 ? (
          <EmptyState
            title="Aucune invitation en attente"
            description="Génère un lien et envoie-le (mail perso, message…). La personne choisit son mot de passe et crée son agence."
          />
        ) : (
          <ul className="space-y-2">
            {pending.map((i) => (
              <li
                key={i.token}
                className="surface-card flex flex-wrap items-center gap-3 p-3 text-sm"
              >
                <Link2 className="text-muted-foreground h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.orgName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {i.email ?? 'lien ouvert'} · expire le {parisDateLabel(i.expiresAt)}
                  </p>
                </div>
                <code className="bg-surface-2 hidden max-w-xs truncate rounded px-2 py-1 text-xs sm:block">
                  {invitationUrl(i.token)}
                </code>
                <Button size="sm" variant="outline" onClick={() => copy(i.token)}>
                  {copied === i.token ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copier le lien
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Retours ({(feedback.data ?? []).filter((f) => f.status === 'new').length} nouveaux)
        </h2>
        {(feedback.data ?? []).length === 0 ? (
          <EmptyState
            title="Aucun retour"
            description="Les retours envoyés depuis « Faire un retour » (agence ou portail) arrivent ici."
          />
        ) : (
          <ul className="space-y-2">
            {(feedback.data ?? []).map((f) => (
              <li
                key={f.id}
                className={cn(
                  'surface-card space-y-2 p-3 text-sm',
                  f.status === 'done' && 'opacity-60',
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-surface-2 rounded px-1.5 py-0.5 font-medium">
                    {FEEDBACK_KIND_LABELS[f.kind]}
                  </span>
                  <span className="text-muted-foreground">
                    {f.authorEmail}
                    {f.orgName ? ` · ${f.orgName}` : ''} · {parisDateLabel(f.createdAt)}
                    {f.path ? ` · ${f.path}` : ''}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{f.message}</p>
                <div className="flex gap-1.5">
                  {(['new', 'seen', 'done'] as FeedbackStatus[]).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={f.status === s ? 'default' : 'outline'}
                      onClick={() => setFbStatus.mutate({ id: f.id, status: s })}
                      disabled={setFbStatus.isPending}
                    >
                      {s === 'new' ? 'Nouveau' : s === 'seen' ? 'Vu' : 'Traité'}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Agences ({orgs.data?.length ?? 0})</h2>
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-2">
            <thead className="text-muted-foreground border-b text-left">
              <tr>
                <th className="font-medium">Agence</th>
                <th className="font-medium">Membres</th>
                <th className="font-medium">Clients</th>
                <th className="font-medium">Créée le</th>
              </tr>
            </thead>
            <tbody>
              {(orgs.data ?? []).map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="font-medium">{o.name}</td>
                  <td>{o.members}</td>
                  <td>{o.clients}</td>
                  <td className="text-muted-foreground">{parisDateLabel(o.createdAt)}</td>
                </tr>
              ))}
              {(orgs.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground">
                    Aucune agence pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title="Générer une invitation"
        description="Un lien à usage unique. La personne l'ouvre, choisit e-mail + mot de passe, et devient Directeur de sa propre agence."
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit} noValidate>
          <FormBody>
            <FormSection title="Agence">
              <FormField label="Nom de l'agence" htmlFor="pi-org">
                <Input
                  id="pi-org"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Studio Machin"
                  autoComplete="off"
                />
              </FormField>
              <FormField
                label="E-mail (facultatif)"
                htmlFor="pi-email"
                hint="Si renseigné, le lien ne marchera qu'avec cet e-mail. Sinon, n'importe qui avec le lien peut l'utiliser."
              >
                <Input
                  id="pi-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </FormField>
            </FormSection>
            {create.isError && (
              <p className="text-destructive text-sm" role="alert">
                {create.error instanceof Error ? create.error.message : 'La génération a échoué.'}
              </p>
            )}
          </FormBody>
          <FormFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending || !orgName.trim()}>
              {create.isPending ? 'Génération…' : 'Générer le lien'}
            </Button>
          </FormFooter>
        </form>
      </FormSheet>
    </Page>
  );
}
