import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg, EventDropArg } from '@fullcalendar/core';
import { POST_STATUS_LABELS } from '@/shared/constants/postStatus';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import type { Post } from '@/shared/types';
import { useReschedulePost } from './usePosts';

const NETWORK_ABBR: Record<string, string> = {
  instagram: 'IG',
  linkedin: 'IN',
  facebook: 'FB',
  tiktok: 'TT',
  x: 'X',
  youtube: 'YT',
  pinterest: 'PT',
  threads: 'TH',
};

interface Props {
  posts: Post[];
  view: 'dayGridMonth' | 'timeGridWeek';
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  editable: boolean;
}

export function CalendarView({ posts, view, clientName, onOpen, editable }: Props) {
  const reschedule = useReschedulePost();

  const events = useMemo(
    () =>
      posts.map((p) => ({
        id: p.id,
        title: p.caption || 'Sans légende',
        start: p.scheduledAt,
        extendedProps: { post: p },
      })),
    [posts],
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
    const post = arg.event.extendedProps.post as Post;
    onOpen(post);
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
        buttonText={{ today: "Aujourd'hui" }}
        eventContent={(arg: EventContentArg) => {
          const post = arg.event.extendedProps.post as Post;
          return (
            <div
              className="flex w-full items-center gap-1 overflow-hidden px-1 text-[11px] leading-tight"
              title={`${clientName(post.clientId)} · ${NETWORK_LABELS[post.network]} · ${POST_STATUS_LABELS[post.status]}`}
            >
              <span className="font-medium tabular-nums">{arg.timeText}</span>
              <span className="border-current/40 rounded border px-0.5 font-semibold">
                {NETWORK_ABBR[post.network]}
              </span>
              <span className="truncate">{clientName(post.clientId)}</span>
              <StatusDot status={post.status} />
            </div>
          );
        }}
      />
    </div>
  );
}

/** Pictogramme de statut monochrome (rempli = validé/planifié/publié). */
function StatusDot({ status }: { status: Post['status'] }) {
  const filled = status === 'approved' || status === 'scheduled' || status === 'published';
  return (
    <span
      aria-hidden="true"
      className={
        'ml-auto inline-block h-2 w-2 shrink-0 rounded-full border border-current ' +
        (filled ? 'bg-current' : '')
      }
    />
  );
}
