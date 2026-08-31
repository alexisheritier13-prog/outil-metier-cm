import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg, EventDropArg } from '@fullcalendar/core';
import { POST_STATUS_LABELS } from '@/shared/constants/postStatus';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { NETWORK_BRAND } from '@/components/networkBrand';
import type { Post } from '@/shared/types';
import { useReschedulePost } from './usePosts';

interface KeyDateMarker {
  id: string;
  date: string;
  name: string;
}

interface Props {
  posts: Post[];
  view: 'dayGridMonth' | 'timeGridWeek';
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  editable: boolean;
  keyDates?: KeyDateMarker[];
}

export function CalendarView({ posts, view, clientName, onOpen, editable, keyDates = [] }: Props) {
  const reschedule = useReschedulePost();

  const events = useMemo(
    () => [
      ...posts.map((p) => ({
        id: p.id,
        title: p.caption || 'Sans légende',
        start: p.scheduledAt,
        classNames: [`fc-status-${p.status}`],
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

  return (
    <div className="fc-monochrome">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view}
        key={view}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        locale="fr"
        firstDay={1}
        // Boutons texte plutôt qu'icônes `role="img"` sans alt (a11y, Story 9.5).
        buttonIcons={false}
        buttonText={{ today: "Aujourd'hui", prev: 'Précédent', next: 'Suivant' }}
        buttonHints={{ prev: 'Période précédente', next: 'Période suivante', today: "Aller à aujourd'hui" }}
        height="auto"
        events={events}
        editable={editable}
        eventStartEditable={editable}
        eventDurationEditable={false}
        droppable={false}
        dayMaxEvents={4}
        nowIndicator
        eventDrop={handleDrop}
        eventClick={handleClick}
        eventContent={(arg: EventContentArg) => {
          const kd = arg.event.extendedProps.keyDate as KeyDateMarker | undefined;
          if (kd) {
            return (
              <div className="truncate px-1 text-[10px] uppercase tracking-wide opacity-70">
                ✦ {kd.name}
              </div>
            );
          }
          const post = arg.event.extendedProps.post as Post;
          return (
            <div
              className="flex w-full items-center gap-1 overflow-hidden px-1 text-[11px] leading-tight"
              title={`${clientName(post.clientId)} · ${NETWORK_LABELS[post.network]} · ${POST_STATUS_LABELS[post.status]}`}
            >
              <span className="font-medium tabular-nums">{arg.timeText}</span>
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 shrink-0"
                fill={NETWORK_BRAND[post.network].hex}
                aria-hidden="true"
              >
                <path d={NETWORK_BRAND[post.network].path} />
              </svg>
              <span className="truncate">{clientName(post.clientId)}</span>
              <StatusDot status={post.status} />
            </div>
          );
        }}
      />
    </div>
  );
}

/** Pastille de statut colorée (info/attention/succès) — doublée du libellé dans le title. */
const DOT_COLOR: Record<Post['status'], string> = {
  draft: 'border-muted-foreground',
  internal_review: 'border-info bg-info',
  client_review: 'border-warning bg-warning',
  approved: 'border-success bg-success',
  scheduled: 'border-success bg-success',
  published: 'border-muted-foreground bg-muted-foreground',
};

function StatusDot({ status }: { status: Post['status'] }) {
  return (
    <span
      aria-hidden="true"
      className={`ml-auto inline-block h-2 w-2 shrink-0 rounded-full border ${DOT_COLOR[status]}`}
    />
  );
}
