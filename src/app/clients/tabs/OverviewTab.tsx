import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NetworkIcon } from '@/components/NetworkIcon';
import { PillarBalance } from '@/components/PillarBalance';
import { parisDateLabel, parisDateTimeLabel } from '@/shared/utils/tz';
import type { Client } from '@/shared/types';
import { listClientPillars } from '@/services/clientPillars';
import { listPosts } from '@/services/posts';
import { getEditorialGuideline } from '@/services/editorialGuidelines';
import { getClientContract } from '@/services/clientContract';
import { listClientContacts } from '@/services/clientContacts';
import { listSocialAccounts } from '@/services/socialAccounts';
import { listClientCredentials } from '@/services/clientCredentials';
import { listClientActivity } from '@/services/clientActivity';
import { listOnboardingItems } from '@/services/onboarding';
import { onboardingKey } from './onboardingKeys';
import { activityLabel } from './activity';

const HEX_RE = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

export function OverviewTab({
  client: c,
  onNavigate,
}: {
  client: Client;
  onNavigate: (tab: string) => void;
}) {
  const id = c.id;
  const contract = useQuery({ queryKey: ['client-contract', id], queryFn: () => getClientContract(id) });
  const guideline = useQuery({
    queryKey: ['editorial-guideline', id],
    queryFn: () => getEditorialGuideline(id),
  });
  const contacts = useQuery({ queryKey: ['client-contacts', id], queryFn: () => listClientContacts(id) });
  const social = useQuery({ queryKey: ['social-accounts', id], queryFn: () => listSocialAccounts(id) });
  const creds = useQuery({
    queryKey: ['client-credentials', id],
    queryFn: () => listClientCredentials(id),
  });
  const onboarding = useQuery({ queryKey: onboardingKey(id), queryFn: () => listOnboardingItems(id) });
  const activity = useQuery({
    queryKey: ['client-activity', id, '', ''],
    queryFn: () => listClientActivity(id),
  });
  const pillars = useQuery({ queryKey: ['client-pillars', id], queryFn: () => listClientPillars(id) });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const monthPosts = useQuery({
    queryKey: ['posts', { clientIds: [id], from: monthStart, to: monthEnd }],
    queryFn: () => listPosts({ clientIds: [id], from: monthStart, to: monthEnd }),
    enabled: (pillars.data ?? []).length > 0,
  });

  const ob = onboarding.data ?? [];
  const obDone = ob.filter((i) => i.isDone).length;
  const colors = (guideline.data?.brandColors ?? []).filter((x) => HEX_RE.test(x.hex));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Fiche" onOpen={() => onNavigate('overview')} noArrow>
        <Dl>
          <Row k="Secteur" v={c.sector || '—'} />
          <Row k="Validation client" v={c.skipClientReview ? 'Désactivée' : 'Activée'} />
          <Row k="Logo" v={c.logoUrl ? <Trunc>{c.logoUrl}</Trunc> : '—'} />
          <Row k="Créé le" v={parisDateLabel(c.createdAt)} />
        </Dl>
      </Panel>

      <Panel title="Prestation" onOpen={() => onNavigate('contract')}>
        {contract.data?.scope || contract.data?.cadence || contract.data?.startDate ? (
          <Dl>
            {contract.data.startDate && (
              <Row k="Début" v={parisDateLabel(contract.data.startDate)} />
            )}
            {contract.data.cadence && <Row k="Rythme" v={<Trunc>{contract.data.cadence}</Trunc>} />}
            {contract.data.scope && (
              <Row k="Livrables" v={<span className="line-clamp-3">{contract.data.scope}</span>} />
            )}
          </Dl>
        ) : (
          <Empty>Prestation non renseignée</Empty>
        )}
      </Panel>

      <Panel title="Charte graphique" onOpen={() => onNavigate('guidelines')}>
        {colors.length === 0 && !guideline.data?.typography ? (
          <Empty>Aucune couleur ni typo</Empty>
        ) : (
          <div className="space-y-3">
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {colors.map((col, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="border-border h-5 w-5 rounded-md border"
                      style={{ backgroundColor: col.hex.startsWith('#') ? col.hex : `#${col.hex}` }}
                    />
                    {col.label || col.hex}
                  </span>
                ))}
              </div>
            )}
            {guideline.data?.typography && (
              <p className="text-muted-foreground whitespace-pre-line text-sm">
                {guideline.data.typography}
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Onboarding" onOpen={() => onNavigate('onboarding')}>
        {ob.length === 0 ? (
          <Empty>Aucune étape</Empty>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avancement</span>
              <span className="font-medium tabular-nums">
                {obDone}/{ob.length}
              </span>
            </div>
            <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${ob.length ? (obDone / ob.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </Panel>

      {(pillars.data ?? []).length > 0 && (
        <Panel
          title="Équilibre du mois"
          onOpen={() => onNavigate('guidelines')}
          className="lg:col-span-2"
        >
          <PillarBalance
            pillars={pillars.data ?? []}
            posts={(monthPosts.data ?? []).map((p) => ({ pillarId: p.pillarId }))}
          />
        </Panel>
      )}

      <Panel title="Contacts" count={contacts.data?.length} onOpen={() => onNavigate('contacts')}>
        {(contacts.data ?? []).length === 0 ? (
          <Empty>Aucun contact</Empty>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {(contacts.data ?? []).slice(0, 4).map((ct) => (
              <li key={ct.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{ct.fullName || ct.email}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {ct.authUserId ? 'Compte' : 'Sans accès'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Comptes sociaux"
        count={social.data?.length}
        onOpen={() => onNavigate('social')}
      >
        {(social.data ?? []).length === 0 ? (
          <Empty>Aucun compte</Empty>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {(social.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <NetworkIcon network={s.network} />
                <span className="truncate">{s.handle || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Codes de connexion"
        count={creds.data?.length}
        onOpen={() => onNavigate('credentials')}
      >
        {(creds.data ?? []).length === 0 ? (
          <Empty>Aucun accès enregistré</Empty>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {(creds.data ?? []).map((cr) => (
              <li
                key={cr.id}
                className="bg-surface-2 rounded-md px-2 py-0.5 text-xs font-medium"
              >
                {cr.label || 'Sans nom'}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Activité récente" onOpen={() => onNavigate('activity')}>
        {(activity.data ?? []).length === 0 ? (
          <Empty>Rien à afficher</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {(activity.data ?? []).slice(0, 5).map((e) => (
              <li key={e.historyId} className="flex items-start gap-2">
                <NetworkIcon network={e.network} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{activityLabel(e)}</span>
                  <span className="text-muted-foreground text-xs">
                    {e.actorName || 'Système'} · {parisDateTimeLabel(e.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  count,
  onOpen,
  noArrow,
  className,
  children,
}: {
  title: string;
  count?: number;
  onOpen: () => void;
  noArrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('surface-card flex flex-col p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {title}
          {count !== undefined && count > 0 && (
            <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">{count}</span>
          )}
        </h3>
        {!noArrow && (
          <button
            type="button"
            onClick={onOpen}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
          >
            Ouvrir <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Dl({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">{children}</dl>;
}
function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0">{v}</dd>
    </>
  );
}
function Trunc({ children }: { children: ReactNode }) {
  return <span className="block truncate">{children}</span>;
}
function Empty({ children }: { children: ReactNode }) {
  return <p className={cn('text-muted-foreground text-sm')}>{children}</p>;
}
