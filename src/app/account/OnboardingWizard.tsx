import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { ImageUploadField } from '@/components/ImageUploadField';
import { NetworkIcon } from '@/components/NetworkIcon';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { saveAccountSettings } from '@/services/accountSettings';
import { saveWorkflowSettings } from '@/services/workflowSettings';
import { useAccountSettings } from './useAccount';

type TeamMode = 'solo' | 'team';
const STEPS = ['Organisation', 'Réseaux', 'Votre agence'] as const;

export function OnboardingWizard() {
  const { data: me } = useCurrentProfile();
  const account = useAccountSettings();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [teamMode, setTeamMode] = useState<TeamMode>('team');
  const [clientsValidate, setClientsValidate] = useState(true);
  const [networks, setNetworks] = useState<Network[]>([...NETWORKS]);
  const [agencyName, setAgencyName] = useState('');
  const [agencyLogoUrl, setAgencyLogoUrl] = useState('');

  const finish = useMutation({
    mutationFn: async (skipped: boolean) => {
      if (skipped) {
        await saveAccountSettings({ onboarded: true });
        return;
      }
      await saveAccountSettings({
        onboarded: true,
        teamMode,
        defaultSkipClientReview: !clientsValidate,
        activeNetworks: networks.length === NETWORKS.length ? null : networks,
        agencyName,
        agencyLogoUrl,
      });
      if (teamMode === 'solo') await saveWorkflowSettings({ skipInternalReview: true });
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
      navigate('/app', { replace: true });
    },
  });

  if (me && me.role !== 'admin') return <Navigate to="/app" replace />;
  if (account.isLoading) return <FullPageSpinner />;
  if (account.data?.onboarded) return <Navigate to="/app" replace />;

  const toggleNetwork = (n: Network) =>
    setNetworks((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  const canNext = step === 1 ? networks.length > 0 : true;
  const last = step === STEPS.length - 1;

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center p-4">
      <div className="bg-surface shadow-panel w-full max-w-lg rounded-3xl border p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="text-[15px] font-semibold tracking-tight">Bienvenue sur Cadence</span>
        </div>

        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                      ? 'bg-primary-surface text-primary-strong ring-primary-border ring-1'
                      : 'bg-surface-2 text-muted-foreground',
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn('text-xs', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-title tracking-tight">Comment travaillez-vous ?</h1>
              <p className="text-muted-foreground mt-1 text-sm">On adapte le circuit de validation.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                icon={User}
                title="Seul"
                desc="Freelance ou studio solo. Pas de validation interne."
                selected={teamMode === 'solo'}
                onClick={() => setTeamMode('solo')}
              />
              <ChoiceCard
                icon={Users}
                title="En équipe"
                desc="Un chef de projet valide en interne avant l'envoi au client."
                selected={teamMode === 'team'}
                onClick={() => setTeamMode('team')}
              />
            </div>
            <div className="border-border bg-surface-2/60 flex items-start gap-3 rounded-lg border p-3 text-sm">
              <input
                id="ob-clients-validate"
                type="checkbox"
                className="accent-primary mt-0.5 h-4 w-4"
                checked={clientsValidate}
                onChange={(e) => setClientsValidate(e.target.checked)}
              />
              <div>
                <label htmlFor="ob-clients-validate" className="font-medium">
                  Mes clients valident les posts avant publication
                </label>
                <p className="text-muted-foreground text-xs">
                  Décochez si vos clients vous font confiance : réglable ensuite client par client.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-title tracking-tight">Quels réseaux gérez-vous ?</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Seuls les réseaux cochés seront proposés. Modifiable plus tard.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NETWORKS.map((n) => {
                const on = networks.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleNetwork(n)}
                    aria-pressed={on}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      on
                        ? 'border-primary bg-primary-surface text-primary-strong font-medium'
                        : 'border-border text-muted-foreground hover:bg-surface-2',
                    )}
                  >
                    <NetworkIcon network={n} />
                    <span className="flex-1 text-left">{NETWORK_LABELS[n]}</span>
                    {on && <Check className="h-4 w-4" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {networks.length === 0 && (
              <p className="text-danger-strong text-xs">Sélectionnez au moins un réseau.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-title tracking-tight">Votre agence</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Affiché dans l'espace client. Laissez vide pour garder « Cadence ».
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ob-name" className="text-sm font-medium">
                Nom de l'agence
              </label>
              <Input
                id="ob-name"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Studio Lumen"
              />
            </div>
            <ImageUploadField
              label="Logo (facultatif)"
              folder="orgs"
              value={agencyLogoUrl}
              onChange={setAgencyLogoUrl}
            />
          </div>
        )}

        {finish.isError && (
          <p className="text-destructive mt-4 text-sm" role="alert">
            L'enregistrement a échoué. Réessayez.
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => finish.mutate(true)} disabled={finish.isPending}>
              Passer
            </Button>
          )}
          {last ? (
            <Button onClick={() => finish.mutate(false)} disabled={finish.isPending}>
              {finish.isPending ? 'Enregistrement…' : 'Terminer'}
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: typeof Users;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors',
        selected ? 'border-primary bg-primary-surface' : 'border-border hover:bg-surface-2',
      )}
    >
      <span
        className={cn(
          'grid h-9 w-9 place-items-center rounded-lg',
          selected ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground',
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-muted-foreground text-xs">{desc}</span>
    </button>
  );
}
