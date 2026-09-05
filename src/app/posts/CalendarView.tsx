import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type {
  DateClickArg,
} from '@fullcalendar/interaction';
import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventMountArg,
} from '@fullcalendar/core';
import { parisWallTimeToUtc } from '@/shared/utils/tz';
import { POST_STATUS_LABELS } from '@/shared/constants/postStatus';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { POST_STATUS_ICONS } from '@/components/postStatusIcons';
import { clientColor } from '@/lib/clientColor';
import type { Post } from '@/shared/types';
import { useReschedulePost } from './usePosts';

interface KeyDateMarker {
  id: string;
  date: string;
  name: string;
}

export interface CalendarViewHandle {
  prev: () => void;
  next: () => void;
  today: () => void;
}

interface Props {
  posts: Post[];
  view: 'dayGridMonth' | 'timeGridWeek';
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  editable: boolean;
  keyDates?: KeyDateMarker[];
  /** Occupe toute la hauteur du conteneur parent (au lieu de s'ajuster au contenu). */
  fill?: boolean;
  /** Clic sur une case vide → créer un post à cette date (ISO UTC). */
  onCreateAt?: (dateIso: string) => void;
  /** Cache le prev/next/today/titre internes : un parent les pilote via la ref. */
  showInternalToolbar?: boolean;
  onRangeChange?: (info: { title: string; start: Date; end: Date }) => void;
}

export const CalendarView = forwardRef<CalendarViewHandle, Props>(function CalendarView(
  {
    posts,
    view,
    clientName,
    onOpen,
    editable,
    keyDates = [],
    fill = false,
    onCreateAt,
    showInternalToolbar = true,
    onRangeChange,
  },
  ref,
) {
  const reschedule = useReschedulePost();
  const calendarRef = useRef<FullCalendar>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const weekColRef = useRef<HTMLDivElement>(null);
  const equalizeTimer = useRef<ReturnType<typeof setTimeout>>();
  // Semaines visibles du mois affiché — sert à construire nous-mêmes la
  // colonne « Semaine » (FullCalendar n'en fait pas une vraie 8ᵉ colonne :
  // son option `weekNumbers` superpose juste un badge dans la case du lundi).
  const [weekStarts, setWeekStarts] = useState<Date[]>([]);

  useImperativeHandle(ref, () => ({
    prev: () => calendarRef.current?.getApi().prev(),
    next: () => calendarRef.current?.getApi().next(),
    today: () => calendarRef.current?.getApi().today(),
  }));

  function handleDateClick(arg: DateClickArg) {
    if (!onCreateAt) return;
    const d = arg.date;
    const iso = arg.allDay
      ? parisWallTimeToUtc({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
          hour: 10,
          minute: 0,
        }).toISOString()
      : d.toISOString();
    onCreateAt(iso);
  }

  const events = useMemo(
    () => [
      ...posts.map((p) => ({
        id: p.id,
        title: p.caption || 'Sans légende',
        start: p.scheduledAt,
        extendedProps: { post: p },
      })),
      ...keyDates.map((k) => ({
        id: `kd-${k.id}`,
        title: k.name,
        start: k.date,
        allDay: true,
        display: 'block' as const,
        editable: false,
        classNames: ['fc-keydate'],
        extendedProps: { keyDate: k },
      })),
    ],
    [posts, keyDates],
  );

  function handleDrop(arg: EventDropArg) {
    const start = arg.event.start;
    if (!start) return arg.revert();
    reschedule.mutate(
      { id: arg.event.id, scheduledAt: start.toISOString() },
      { onError: () => arg.revert() },
    );
  }

  function handleClick(arg: EventClickArg) {
    const post = arg.event.extendedProps.post as Post | undefined;
    if (post) onOpen(post);
  }

  function handleDatesSet(arg: DatesSetArg) {
    onRangeChange?.({ title: arg.view.title, start: arg.start, end: arg.end });
    if (view === 'dayGridMonth') {
      const starts: Date[] = [];
      for (const d = new Date(arg.start); d < arg.end; d.setDate(d.getDate() + 7)) {
        starts.push(new Date(d));
      }
      setWeekStarts(starts);
    }
    // Le nombre de lignes change avec le mois (4 à 6) : on ne peut pas fixer
    // leur part de hauteur en CSS statique, donc on la recalcule ici.
    setTimeout(equalizeMonthRows, 0);
  }

  // FullCalendar réserve un créneau fixe (~50px) par événement en vue Mois,
  // quel que soit le contenu réel — ce qui rend les lignes de la grille très
  // inégales (une case avec 3 posts devient bien plus haute qu'une case
  // vide). Aucune règle CSS ne parvient à le surcharger (FC réapplique la
  // hauteur lui-même) : on la resserre donc directement sur l'élément monté,
  // pour que toutes les cases gardent la même taille.
  function handleEventDidMount(arg: EventMountArg) {
    if (view !== 'dayGridMonth') return;
    const harness = arg.el.closest<HTMLElement>('.fc-daygrid-event-harness');
    harness?.style.setProperty('height', '1.625rem', 'important');
    // Le contenu (nb d'événements) influence encore le partage de hauteur
    // que FullCalendar fait entre les lignes ; on ré-égalise après chaque
    // salve de montage d'événements (debounce simple).
    if (equalizeTimer.current) clearTimeout(equalizeTimer.current);
    equalizeTimer.current = setTimeout(equalizeMonthRows, 30);
  }

  function equalizeMonthRows() {
    if (view !== 'dayGridMonth') return;
    const root = containerRef.current;
    const rows = root?.querySelectorAll<HTMLElement>('.fc-daygrid-body tr');
    const headerCell = root?.querySelector<HTMLElement>('.fc-col-header-cell');
    if (!root || !rows || rows.length === 0) return;
    // Le budget vient du conteneur (hauteur fixe, imposée du dehors), jamais
    // du contenu de la grille elle-même : mesurer `.fc-daygrid-body` après
    // coup renvoie sa taille NATURELLE (celle que le contenu demande), qui
    // peut dépasser ce qui est réellement disponible (jours à 2-3 posts) —
    // diviser cette valeur-là ne fait que déplacer le débordement au lieu de
    // le supprimer. Le budget fixe garantit qu'on ne dépasse jamais l'espace
    // alloué, quitte à ce qu'un jour très chargé s'appuie sur « +N de plus ».
    const available = root.getBoundingClientRect().height - (headerCell?.getBoundingClientRect().height ?? 0);
    const each = available / rows.length;
    rows.forEach((r: HTMLElement) => r.style.setProperty('height', `${each}px`, 'important'));
    // La hauteur sur la <tr> n'est qu'un minimum en mise en page table : le
    // contenu (un jour à 2 posts + « +N de plus ») peut encore la pousser
    // plus haut. On plafonne donc aussi la tuile elle-même (hauteur fixe +
    // overflow:hidden, au lieu de height:100%) pour que la ligne ne puisse
    // plus grandir derrière son dos.
    root
      .querySelectorAll<HTMLElement>('.fc-daygrid-day-frame')
      .forEach((f) => f.style.setProperty('height', `${each}px`, 'important'));
    // La colonne « Semaine » (à côté, hors FullCalendar) aligne juste son
    // en-tête sur celui des jours ; ses lignes se répartissent en CSS
    // (flex-1) plutôt qu'en pixels calculés, pour ne jamais désynchroniser
    // sa hauteur totale de celle de la grille.
    const header = root?.querySelector<HTMLElement>('.fc-col-header-cell');
    const headerH = header?.getBoundingClientRect().height ?? 0;
    const weekHeader = weekColRef.current?.querySelector<HTMLElement>('[data-week-header]');
    if (weekHeader) weekHeader.style.setProperty('height', `${headerH}px`, 'important');
  }

  return (
    <div className={fill ? 'flex h-full gap-2' : 'flex'}>
    <div ref={containerRef} className={fill ? 'fc-monochrome h-full min-w-0 flex-1' : 'fc-monochrome min-w-0 flex-1'}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view}
        key={view}
        headerToolbar={showInternalToolbar ? { left: 'prev,next today', center: 'title', right: '' } : false}
        locale="fr"
        firstDay={1}
        // N'affiche que les semaines nécessaires au mois (pas de 6ᵉ ligne
        // vide) : avec des cases à hauteur fixe, chaque ligne en moins compte.
        fixedWeekCount={false}
        // Boutons texte plutôt qu'icônes `role="img"` sans alt (a11y, Story 9.5).
        buttonIcons={false}
        buttonText={{ today: "Aujourd'hui", prev: 'Précédent', next: 'Suivant' }}
        buttonHints={{ prev: 'Période précédente', next: 'Période suivante', today: "Aller à aujourd'hui" }}
        height={fill ? '100%' : 'auto'}
        events={events}
        editable={editable}
        eventStartEditable={editable}
        eventDurationEditable={false}
        droppable={false}
        dayMaxEvents={view === 'dayGridMonth' ? 2 : fill ? true : 4}
        // Plage resserrée aux heures ouvrées : la semaine tient sur un écran
        // sans défilement (24h complètes ne servaient qu'à afficher du vide).
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        slotDuration="01:00:00"
        slotLabelInterval="01:00:00"
        expandRows
        nowIndicator
        eventDrop={handleDrop}
        eventClick={handleClick}
        eventDidMount={handleEventDidMount}
        dateClick={onCreateAt ? handleDateClick : undefined}
        datesSet={handleDatesSet}
        eventContent={(arg: EventContentArg) => {
          const kd = arg.event.extendedProps.keyDate as KeyDateMarker | undefined;
          if (kd) {
            return (
              <div className="bg-keydate-surface text-keydate-strong mx-0.5 mt-0.5 truncate rounded px-1.5 py-px text-[10px] font-medium">
                ✦ {kd.name}
              </div>
            );
          }
          const post = arg.event.extendedProps.post as Post;
          const cc = clientColor(post.clientId);
          const StatusIcon = POST_STATUS_ICONS[post.status];
          return (
            <div
              className="flex w-full items-center gap-1 overflow-hidden rounded px-1 py-px text-[11px] leading-tight"
              style={{ backgroundColor: cc.soft, color: cc.ink }}
              title={`${clientName(post.clientId)} · ${NETWORK_LABELS[post.network]} · ${POST_STATUS_LABELS[post.status]}`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: cc.color }}
                aria-hidden="true"
              />
              <span className="font-medium tabular-nums">{arg.timeText}</span>
              <span className="truncate">{post.caption || 'Sans légende'}</span>
              <StatusIcon
                className={`ml-auto size-3 shrink-0 ${STATUS_ICON_COLOR[post.status]}`}
                strokeWidth={2.5}
                aria-hidden="true"
              />
              <span className="sr-only">
                {clientName(post.clientId)} · {POST_STATUS_LABELS[post.status]}
              </span>
            </div>
          );
        }}
      />
    </div>
    {/* Colonne « Semaine », construite à part : FullCalendar n'en fait pas une
        vraie colonne (son option `weekNumbers` superpose juste un badge dans
        la case du lundi, qui masquait sa date et ses posts). */}
    {view === 'dayGridMonth' && (
      <div ref={weekColRef} className="flex h-full w-24 shrink-0 flex-col">
        <div
          data-week-header
          className="text-muted-foreground flex shrink-0 items-end pb-1 text-[13px] font-medium"
        >
          Semaine
        </div>
        {/* Les lignes se répartissent à parts égales (flex-1) au lieu d'une
            hauteur calculée en pixels : la colonne ne peut alors jamais
            dépasser (ou être plus courte) que la grille FullCalendar juste
            à côté, toutes deux calées sur `h-full`. */}
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {weekStarts.map((ws) => (
            <div
              key={ws.toISOString()}
              className="bg-surface min-h-0 flex-1 overflow-hidden rounded-[0.9375rem]"
            >
              <WeekBadge weekStart={ws} posts={posts} />
            </div>
          ))}
        </div>
      </div>
    )}
    </div>
  );
});

/** Contenu de la 8ᵉ colonne « Semaine » : numéro, total, mini-histogramme lun.→ven.
 *  `h-full` + `justify-between` : quelle que soit la hauteur de la ligne (les
 *  lignes sont égalisées par `equalizeMonthRows`), le bloc l'occupe entièrement
 *  au lieu de rester une pastille collée en haut avec du vide dessous. */
function WeekBadge({ weekStart, posts }: { weekStart: Date; posts: Post[] }) {
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const counts = days.map(
    (d) => posts.filter((p) => isSameDay(new Date(p.scheduledAt), d)).length,
  );
  const total = counts.reduce((s, n) => s + n, 0);
  const max = Math.max(...counts, 1);
  const weekNumber = getISOWeek(weekStart);

  return (
    <div className="flex h-full w-full flex-col justify-between gap-1 px-2 py-1.5 text-left">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-sm font-bold">S{weekNumber}</span>
        <span className="text-muted-foreground whitespace-nowrap text-[10px]">
          {total} post{total > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex h-6 items-end gap-1">
        {counts.map((n, i) => (
          <span
            key={i}
            className="flex-1 rounded-[2px]"
            style={{
              height: `${Math.max((n / max) * 100, n > 0 ? 30 : 10)}%`,
              backgroundColor: n > 0 ? 'var(--primary)' : 'var(--surface-2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Couleur de l'icône de statut sur l'événement. Le SENS est porté par la FORME de
 * l'icône (icône différente par statut) ; la couleur ne fait que renforcer.
 */
const STATUS_ICON_COLOR: Record<Post['status'], string> = {
  draft: 'text-muted-foreground',
  internal_review: 'text-info-strong',
  client_review: 'text-warning-strong',
  approved: 'text-success-strong',
  scheduled: 'text-success-strong',
  published: 'text-muted-foreground',
};
