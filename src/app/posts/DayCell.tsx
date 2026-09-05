import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Post } from '@/shared/types';
import { EventChip } from './EventChip';

interface KeyDateMarker {
  id: string;
  date: string;
  name: string;
}

interface Props {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  posts: Post[];
  keyDate?: KeyDateMarker;
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  onCreateAt?: (dateKey: string) => void;
  editable: boolean;
  dragOver: boolean;
  onDragStartPost: (id: string) => void;
  onDragEndPost: () => void;
  onDragOverDay: (dateKey: string | null) => void;
  onDropPost: (dateKey: string) => void;
}

const MAX_VISIBLE = 3;

/** Une case du calendrier Mois — date, marronnier éventuel, jusqu'à 3 posts. */
export function DayCell({
  dateKey,
  dayNumber,
  inMonth,
  isWeekend,
  isToday,
  posts,
  keyDate,
  clientName,
  onOpen,
  onCreateAt,
  editable,
  dragOver,
  onDragStartPost,
  onDragEndPost,
  onDragOverDay,
  onDropPost,
}: Props) {
  const visible = posts.slice(0, MAX_VISIBLE);
  const hidden = posts.slice(MAX_VISIBLE);

  const bg = !inMonth
    ? 'oklch(0.978 0.004 265)'
    : isWeekend
      ? 'oklch(0.982 0.004 265)'
      : 'var(--surface-sunk)';

  return (
    <div
      className="flex min-h-[112px] flex-col gap-1 rounded-[15px] p-[9px]"
      style={{
        background: bg,
        boxShadow: isToday ? 'inset 0 0 0 2px var(--primary)' : undefined,
        outline: dragOver ? '2px dashed var(--primary)' : undefined,
        outlineOffset: dragOver ? '-2px' : undefined,
      }}
      role={onCreateAt ? 'button' : undefined}
      tabIndex={onCreateAt ? 0 : undefined}
      aria-label={onCreateAt ? `Créer un post le ${dayNumber}` : undefined}
      onClick={() => onCreateAt?.(dateKey)}
      onKeyDown={
        onCreateAt
          ? (e) => {
              if (e.target !== e.currentTarget) return; // pas sur un post/bouton enfant
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCreateAt(dateKey);
              }
            }
          : undefined
      }
      onDragOver={
        editable
          ? (e) => {
              e.preventDefault();
              onDragOverDay(dateKey);
            }
          : undefined
      }
      onDragLeave={editable ? () => onDragOverDay(null) : undefined}
      onDrop={
        editable
          ? (e) => {
              e.preventDefault();
              onDropPost(dateKey);
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={
            isToday
              ? 'bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums'
              : `text-xs font-extrabold tabular-nums ${inMonth ? 'text-foreground' : 'text-ink-faint'}`
          }
        >
          {dayNumber}
        </span>
        {keyDate && (
          <span
            className="bg-keydate-surface text-keydate-strong truncate rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold"
            title={keyDate.name}
          >
            {keyDate.name}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {visible.map((p) => (
          <EventChip
            key={p.id}
            post={p}
            clientName={clientName(p.clientId)}
            onOpen={() => onOpen(p)}
            draggable={editable}
            onDragStart={() => onDragStartPost(p.id)}
            onDragEnd={onDragEndPost}
          />
        ))}
        {hidden.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="text-primary self-start px-1 text-[11px] font-bold hover:underline"
              >
                +{hidden.length} autre{hidden.length > 1 ? 's' : ''}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" onClick={(e) => e.stopPropagation()}>
              <ul className="flex flex-col gap-1">
                {hidden.map((p) => (
                  <li key={p.id}>
                    <EventChip
                      post={p}
                      clientName={clientName(p.clientId)}
                      onOpen={() => onOpen(p)}
                    />
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
