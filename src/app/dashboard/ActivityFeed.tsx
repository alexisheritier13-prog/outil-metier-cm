import { ChevronDown } from 'lucide-react';
import { NetworkIcon } from '@/components/NetworkIcon';
import { activityCategory, type ActivityCategory } from '@/app/clients/tabs/activity';
import { clientColor, clientInitials } from '@/lib/clientColor';
import { relativeAge } from '@/lib/relativeTime';
import type { ClientActivityEntry } from '@/shared/types';

const VISIBLE = 3;

/** Teinte de la pastille par catégorie — jamais la couleur seule (le texte du
 *  libellé porte déjà le sens), juste un repère visuel rapide. */
const CATEGORY_TONE: Record<ActivityCategory, string> = {
  submitted: 'bg-info-surface text-info-strong',
  internal_approved: 'bg-success-surface text-success-strong',
  client_approved: 'bg-success-surface text-success-strong',
  scheduled: 'bg-success-surface text-success-strong',
  published: 'bg-success-surface text-success-strong',
  returned: 'bg-warning-surface text-warning-strong',
  client_rejected: 'bg-warning-surface text-warning-strong',
  create: 'bg-primary-surface text-primary-strong',
  update: 'bg-primary-surface text-primary-strong',
  trash: 'bg-surface-3 text-muted-foreground',
  restore: 'bg-surface-3 text-muted-foreground',
  note: 'bg-primary-surface text-primary-strong',
  other: 'bg-surface-3 text-muted-foreground',
};

/** Verbe (sujet = l'auteur de l'action) suivi, s'il y a lieu, de « le post ». */
const CATEGORY_VERB: Record<ActivityCategory, string> = {
  create: 'a créé',
  submitted: 'a soumis à la validation interne',
  internal_approved: 'a validé en interne et envoyé au client',
  returned: 'a renvoyé au rédacteur',
  client_approved: 'a approuvé',
  client_rejected: 'a demandé une modification sur',
  scheduled: 'a planifié',
  published: 'a publié',
  trash: 'a mis à la corbeille',
  restore: 'a restauré',
  update: 'a modifié',
  note: 'a ajouté une note sur',
  other: 'a changé le statut de',
};

function truncateCaption(caption: string, max = 42): string {
  return caption.length > max ? caption.slice(0, max - 1).trimEnd() + '…' : caption;
}

/** Phrase narrative « {auteur} {verbe} « {légende} » » — jamais inventée : ne
 *  s'appuie que sur des champs réels de l'entrée (acteur, action, légende). */
function activityNarrative(e: ClientActivityEntry): { actor: string; text: string } {
  const actor = e.actorName || 'Le système';
  const verb = CATEGORY_VERB[activityCategory(e)];
  const quoted = e.postCaption ? ` « ${truncateCaption(e.postCaption)} »` : '';
  return { actor, text: `${verb}${quoted}` };
}

/** Jusqu'à 3 acteurs distincts parmi les entrées masquées, pour la pile d'avatars
 *  du repli — jamais plus, pour rester lisible. */
function hiddenActors(hidden: ClientActivityEntry[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const e of hidden) {
    const id = e.actorId || e.actorName || 'système';
    if (!seen.has(id)) seen.set(id, e.actorName || 'Système');
    if (seen.size >= 3) break;
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

export function ActivityFeed({
  rows,
  expanded,
  onExpand,
  clientName,
}: {
  rows: ClientActivityEntry[];
  expanded: boolean;
  onExpand: () => void;
  clientName: (id: string | null) => string;
}) {
  const visible = expanded ? rows : rows.slice(0, VISIBLE);
  const hidden = rows.slice(VISIBLE);
  const oldestHiddenAt = hidden[hidden.length - 1]?.createdAt;

  if (rows.length === 0) {
    return <p className="text-muted-foreground p-4 text-sm">Rien à afficher.</p>;
  }

  return (
    <ul className="divide-border/60 relative divide-y">
      {visible.map((e, i) => {
        const { actor, text } = activityNarrative(e);
        return (
          <li key={e.historyId} className="relative flex items-start gap-3 p-3 text-sm">
            {i < visible.length - 1 && (
              <span className="bg-border absolute left-[1.6rem] top-9 h-[calc(100%-0.5rem)] w-px" />
            )}
            <span
              className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-full ${CATEGORY_TONE[activityCategory(e)]}`}
            >
              <NetworkIcon network={e.network} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {actor} <span className="font-normal">{text}</span>
              </span>
              <span className="text-muted-foreground text-xs">
                {clientName(e.clientId)} · {relativeAge(e.createdAt)}
              </span>
            </span>
          </li>
        );
      })}
      {!expanded && hidden.length > 0 && (
        <li>
          <button
            type="button"
            onClick={onExpand}
            className="hover:bg-surface-2 text-muted-foreground flex w-full items-center gap-2 p-3 text-left text-sm transition-colors"
          >
            <span className="flex shrink-0 -space-x-1.5">
              {hiddenActors(hidden).map(({ id, name }) => {
                const cc = clientColor(id);
                return (
                  <span
                    key={id}
                    className="ring-surface grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ring-2"
                    style={{ backgroundColor: cc.soft, color: cc.ink }}
                  >
                    {clientInitials(name)}
                  </span>
                );
              })}
            </span>
            <span className="flex-1">
              {hidden.length} action{hidden.length > 1 ? 's' : ''} de plus
              {oldestHiddenAt && <> · {relativeAge(oldestHiddenAt)}</>}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </li>
      )}
    </ul>
  );
}
