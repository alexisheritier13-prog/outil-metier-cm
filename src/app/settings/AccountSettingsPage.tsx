import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { Page, PageHeader } from '@/components/Page';
import { NetworkIcon } from '@/components/NetworkIcon';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { saveAccountSettings, type AccountSettings } from '@/services/accountSettings';
import { saveWorkflowSettings } from '@/services/workflowSettings';
import { useAccountSettings } from '@/app/account/useAccount';

export function AccountSettingsPage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const account = useAccountSettings();
  const [draft, setDraft] = useState<AccountSettings | null>(null);

  useEffect(() => {
    if (account.data && !draft) setDraft(account.data);
  }, [account.data, draft]);

  const save = useMutation({
    mutationFn: async (v: AccountSettings) => {
      await saveAccountSettings(v);
      if (v.teamMode === 'solo') await saveWorkflowSettings({ skipInternalReview: true });
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  if (!me || me.role !== 'admin') return null;
  if (account.isLoading || !draft) return <FullPageSpinner />;

  const networks = draft.activeNetworks ?? [...NETWORKS];
  const setNetworks = (list: Network[]) =>
    setDraft({ ...draft, activeNetworks: list.length === NETWORKS.length ? null : list });
  const toggle = (n: Network) =>
    setNetworks(networks.includes(n) ? networks.filter((x) => x !== n) : [...networks, n]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(account.data);

  return (
    <Page size="form">
      <PageHeader
        title="Compte"
        description="Préréglages de l'agence : organisation, réseaux, espace client."
      />

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty && networks.length > 0) save.mutate(draft);
        }}
      >
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Organisation</h2>
          <div className="flex flex-wrap gap-2">
            {(['team', 'solo'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraft({ ...draft, teamMode: mode })}
                aria-pressed={draft.teamMode === mode}
                className={cn(
                  'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
                  draft.teamMode === mode
                    ? 'border-primary bg-primary-surface text-primary-strong'
                    : 'border-border text-muted-foreground hover:bg-surface-2',
                )}
              >
                {mode === 'team' ? 'En équipe' : 'Seul (freelance)'}
              </button>
            ))}
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 h-4 w-4"
              checked={!draft.defaultSkipClientReview}
              onChange={(e) => setDraft({ ...draft, defaultSkipClientReview: !e.target.checked })}
            />
            <span>
              Par défaut, les nouveaux clients valident les posts avant publication
              <span className="text-muted-foreground block text-xs">
                Réglable ensuite client par client.
              </span>
            </span>
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Réseaux proposés</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NETWORKS.map((n) => {
              const on = networks.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggle(n)}
                  aria-pressed={on}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    on
                      ? 'border-primary bg-primary-surface text-primary-strong font-medium'
                      : 'border-border text-muted-foreground hover:bg-surface-2',
                  )}
                >
                  <NetworkIcon network={n} />
                  <span className="flex-1 text-left">{NETWORK_LABELS[n]}</span>
                  {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {networks.length === 0 && (
            <p className="text-danger-strong text-xs">Gardez au moins un réseau.</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Espace client</h2>
          <div className="space-y-1.5">
            <label htmlFor="ac-name" className="text-sm font-medium">
              Nom de l'agence
            </label>
            <Input
              id="ac-name"
              value={draft.agencyName}
              onChange={(e) => setDraft({ ...draft, agencyName: e.target.value })}
              placeholder="Cadence"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ac-logo" className="text-sm font-medium">
              Logo (URL)
            </label>
            <Input
              id="ac-logo"
              value={draft.agencyLogoUrl}
              onChange={(e) => setDraft({ ...draft, agencyLogoUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending || !dirty || networks.length === 0}>
            Enregistrer
          </Button>
          {save.isSuccess && !save.isPending && !dirty && (
            <span
              className="text-success-strong inline-flex items-center gap-1 text-sm"
              role="status"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Enregistré
            </span>
          )}
        </div>
      </form>
    </Page>
  );
}
