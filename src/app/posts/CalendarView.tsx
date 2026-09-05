import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
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
  /** Le planning interne a sa propre grille maison pour le Mois (`MonthGrid`)
   *  et n'utilise plus ce composant que pour la Semaine — mais le portail
   *  client (`PortalCalendarPage`), lui, garde un mois FullCalendar standard
   *  (lecture seule, pas les mêmes contraintes de mise en page). */
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
  }

  return (
    <div className={fill ? 'fc-monochrome h-full' : 'fc-monochrome'}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view}
        key={view}
        headerToolbar={showInternalToolbar ? { left: 'prev,next today', center: 'title', right: '' } : false}
        locale="fr"
        firstDay={1}
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
        dayMaxEvents={view === 'dayGridMonth' ? 3 : fill ? true : 4}
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
  );
});

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
