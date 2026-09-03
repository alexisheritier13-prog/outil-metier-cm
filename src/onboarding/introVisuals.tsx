import { CheckCircle2, CircleDashed, Eye, Send } from 'lucide-react';

/** Petits schémas d'illustration pour le carrousel d'intro (aucune donnée réelle). */

export function FlowRow() {
  const steps = ['Idée', 'Brouillon', 'Validation', 'Planifié', 'Publié'];
  return (
    <div className="bg-surface-2 flex flex-wrap items-center gap-1.5 rounded-xl border p-3 text-xs">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="bg-surface rounded-md border px-2 py-1 font-medium">{s}</span>
          {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
        </span>
      ))}
    </div>
  );
}

export function MiniCalendar() {
  return (
    <div className="bg-surface-2 rounded-xl border p-3">
      <div className="text-muted-foreground mb-2 flex gap-2 text-[10px] font-medium uppercase tracking-wide">
        {['lun', 'mar', 'mer', 'jeu', 'ven'].map((d) => (
          <span key={d} className="flex-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="bg-surface min-h-[34px] rounded-md border p-1">
            <span className="text-muted-foreground text-[9px]">{i + 1}</span>
            {[1, 3, 4, 8, 11].includes(i) && (
              <span
                className={
                  [1, 8].includes(i)
                    ? 'bg-warning-surface border-warning-border mt-0.5 block h-1.5 rounded-full border'
                    : 'bg-success-surface border-success-border mt-0.5 block h-1.5 rounded-full border'
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Pipeline() {
  const rows = [
    { icon: CircleDashed, label: 'Brouillon', who: 'le CM rédige' },
    { icon: Eye, label: 'Validation interne', who: 'relecture agence' },
    { icon: Send, label: 'Validation client', who: 'le client approuve' },
    { icon: CheckCircle2, label: 'Planifié', who: 'prêt à publier' },
  ];
  return (
    <div className="bg-surface-2 space-y-1.5 rounded-xl border p-3">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-2.5">
          <span className="bg-surface grid h-7 w-7 shrink-0 place-items-center rounded-lg border">
            <r.icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-medium">{r.label}</span>
          <span className="text-muted-foreground text-xs">· {r.who}</span>
          {i < rows.length - 1 && <span className="text-muted-foreground ml-auto text-xs">↓</span>}
        </div>
      ))}
    </div>
  );
}

export function LibraryGrid() {
  const tiles = [
    { label: 'Idées', desc: 'inspiration non datée' },
    { label: 'Templates', desc: 'posts réutilisables' },
    { label: 'Marronniers', desc: 'dates clés du calendrier' },
    { label: 'Campagnes', desc: 'regrouper des posts' },
  ];
  return (
    <div className="bg-surface-2 grid grid-cols-2 gap-2 rounded-xl border p-3">
      {tiles.map((t) => (
        <div key={t.label} className="bg-surface rounded-lg border p-2.5">
          <p className="text-sm font-medium">{t.label}</p>
          <p className="text-muted-foreground text-xs">{t.desc}</p>
        </div>
      ))}
    </div>
  );
}
