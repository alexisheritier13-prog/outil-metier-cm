import { getSupabase } from '@/lib/supabase';
import { requireOrgId } from '@/services/org';
import { NETWORKS, type Network } from '@/shared/constants/networks';

/**
 * Configuration du compte de l'agence (`org_settings.account`, par organisation).
 * Préréglages posés une fois (assistant de bienvenue), re-modifiables dans
 * Paramètres › Compte. Lecture : tout utilisateur actif de l'organisation (le
 * portail lit le nom / logo). Écriture : Directeur.
 */
export interface AccountSettings {
  /** L'assistant de bienvenue a été complété (ou passé). */
  onboarded: boolean;
  /** `solo` = freelance / studio solo ; `team` = agence avec chef de projet. */
  teamMode: 'solo' | 'team';
  /** Les nouveaux clients sont créés avec « ne valide pas les posts » coché. */
  defaultSkipClientReview: boolean;
  /** Réseaux proposés dans l'app. `null` = tous. */
  activeNetworks: Network[] | null;
  /** Nom de l'agence affiché dans le portail client (vide = « Cadence »). */
  agencyName: string;
  /** Logo de l'agence (URL) affiché dans le portail. */
  agencyLogoUrl: string;
  /** Passe les posts planifiés en « publié » automatiquement à l'heure prévue. */
  autoPublish: boolean;
}

export const DEFAULT_ACCOUNT: AccountSettings = {
  onboarded: false,
  teamMode: 'team',
  defaultSkipClientReview: false,
  activeNetworks: null,
  agencyName: '',
  agencyLogoUrl: '',
  autoPublish: false,
};

/** Résout la liste effective des réseaux (jamais vide). */
export function resolveActiveNetworks(active: readonly string[] | null | undefined): Network[] {
  if (!active || active.length === 0) return [...NETWORKS];
  const kept = NETWORKS.filter((n) => active.includes(n));
  return kept.length > 0 ? kept : [...NETWORKS];
}

interface AccountRow {
  onboarded?: boolean;
  team_mode?: string;
  default_skip_client_review?: boolean;
  active_networks?: string[] | null;
  agency_name?: string;
  agency_logo_url?: string;
  auto_publish?: boolean;
}

function fromRow(v: AccountRow): AccountSettings {
  return {
    onboarded: Boolean(v.onboarded),
    teamMode: v.team_mode === 'solo' ? 'solo' : 'team',
    defaultSkipClientReview: Boolean(v.default_skip_client_review),
    activeNetworks:
      Array.isArray(v.active_networks) && v.active_networks.length > 0
        ? NETWORKS.filter((n) => v.active_networks!.includes(n))
        : null,
    agencyName: typeof v.agency_name === 'string' ? v.agency_name : '',
    agencyLogoUrl: typeof v.agency_logo_url === 'string' ? v.agency_logo_url : '',
    autoPublish: Boolean(v.auto_publish),
  };
}

function toRow(s: AccountSettings) {
  return {
    onboarded: s.onboarded,
    team_mode: s.teamMode,
    default_skip_client_review: s.defaultSkipClientReview,
    active_networks: s.activeNetworks as string[] | null,
    agency_name: s.agencyName.trim(),
    agency_logo_url: s.agencyLogoUrl.trim(),
    auto_publish: s.autoPublish,
  };
}

export async function getAccountSettings(): Promise<AccountSettings> {
  // RLS restreint `org_settings` à l'organisation de l'appelant → filtre sur la clé suffit.
  const { data, error } = await getSupabase()
    .from('org_settings')
    .select('value')
    .eq('key', 'account')
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow((data.value ?? {}) as AccountRow) : { ...DEFAULT_ACCOUNT };
}

export async function saveAccountSettings(patch: Partial<AccountSettings>): Promise<AccountSettings> {
  const current = await getAccountSettings();
  const next = { ...current, ...patch };
  const organization_id = await requireOrgId();
  const { error } = await getSupabase()
    .from('org_settings')
    .upsert(
      { organization_id, key: 'account', value: toRow(next) },
      { onConflict: 'organization_id,key' },
    );
  if (error) throw error;
  return next;
}
