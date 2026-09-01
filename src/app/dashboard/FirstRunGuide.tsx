import { Link } from 'react-router-dom';
import { ArrowRight, Check, Settings2, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  hasClients: boolean;
  hasPosts: boolean;
}

/** Guide de démarrage : visible tant que le compte n'a pas de client + de post. */
export function FirstRunGuide({ hasClients, hasPosts }: Props) {
  if (hasClients && hasPosts) return null;

  const steps = [
    {
      done: true,
      icon: Settings2,
      title: 'Configurer le compte',
      desc: 'Organisation, réseaux, espace client.',
      to: '/app/parametres/compte',
      cta: 'Revoir',
    },
    {
      done: hasClients,
      icon: Users,
      title: 'Créer votre premier client',
      desc: 'Chaque post est rattaché à un client.',
      to: '/app/clients?new=1',
      cta: 'Créer un client',
    },
    {
      done: hasPosts,
      icon: Sparkles,
      title: 'Programmer votre premier post',
      desc: 'Ou tout un mois d’un coup avec « Série ».',
      to: '/app/planning?new=1',
      cta: 'Nouveau post',
      disabled: !hasClients,
    },
  ];

  return (
    <section className="surface-card p-5 sm:p-6">
      <h2 className="text-section mb-1">Bienvenue sur Cadence</h2>
      <p className="text-muted-foreground mb-5 text-sm">
        Trois étapes pour démarrer. Ce guide disparaîtra ensuite.
      </p>
      <ol className="space-y-2">
        {steps.map((s) => (
          <li
            key={s.title}
            className={cn(
              'flex items-center gap-3.5 rounded-xl border p-3.5',
              s.done ? 'border-border bg-surface-2/50' : 'border-primary-border bg-primary-surface/40',
            )}
          >
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                s.done ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground',
              )}
            >
              {s.done ? <Check className="h-[18px] w-[18px]" /> : <s.icon className="h-[18px] w-[18px]" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', s.done && 'text-muted-foreground line-through')}>
                {s.title}
              </p>
              <p className="text-muted-foreground text-xs">{s.desc}</p>
            </div>
            {!s.done && (
              <Link
                to={s.to}
                aria-disabled={s.disabled}
                className={cn(
                  'bg-primary text-primary-foreground inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium',
                  s.disabled && 'pointer-events-none opacity-50',
                )}
              >
                {s.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
