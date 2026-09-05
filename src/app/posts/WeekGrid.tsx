import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { parisDateKey, parisWallTimeToUtc, toParisParts } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { WeekPostCard } from './WeekPostCard';
import { useReschedulePost } from './usePosts';

interface KeyDateMarker {
  id: string;
  date: string;
  name: string;
}

export interface WeekGridHandle {
  prev: () => void;
  next: () => void;
  today: () => void;
}

interface Props {
  posts: Post[];
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  onCreateAt?: (dateIso: string) => void;
  keyDates?: KeyDateMarker[];
  editable: boolean;
  onRangeChange?: (info: { title: string; start: Date; end: Date }) => void;
}

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18; // exclusif — dernier créneau 16–18

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function keyOf(year: number, month0: number, day: number): string {
  const d = new Date(Date.UTC(year, month0, day));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Lundi (ISO) de la semaine contenant cette date. */
function mondayOf(year: number, month0: number, day: number) {
  const d = new Date(Date.UTC(year, month0, day));
  const dow = d.getUTCDay() || 7; // 1=lun..7=dim
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return { year: d.getUTCFullYear(), month0: d.getUTCMonth(), day: d.getUTCDate() };
}

function formatWeekTitle(start: { year: number; month0: number; day: number }, endDay: number, endMonth0: number, endYear: number): string {
  const sameMonth = start.month0 === endMonth0 && start.year === endYear;
  if (sameMonth) {
    return `${start.day} – ${endDay} ${MONTH_SHORT[endMonth0]} ${endYear}`;
  }
  return `${start.day} ${MONTH_SHORT[start.month0]} – ${endDay} ${MONTH_SHORT[endMonth0]} ${endYear}`;
}

/**
 * Grille de la Semaine, en CSS Grid pur — même logique que `MonthGrid` (cursor
 * interne, filtrage client-side des posts déjà chargés). Les créneaux horaires
 * s'étendent automatiquement si des posts existent hors de la plage par défaut
 * (08h–18h) : aucun post ne doit disparaître de la vue.
 */
export const WeekGrid = forwardRef<WeekGridHandle, Props>(function WeekGrid(
  { posts, clientName, onOpen, onCreateAt, keyDates = [], editable, onRangeChange },
  ref,
) {
  const [cursor, setCursor] = useState(() => {
    const p = toParisParts(new Date());
    return mondayOf(p.year, p.month - 1, p.day);
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ dayKey: string; slot: number } | null>(null);
  const reschedule = useReschedulePost();

  useImperativeHandle(ref, () => ({
    prev: () =>
      setCursor((c) => {
        const d = new Date(Date.UTC(c.year, c.month0, c.day - 7));
        return { year: d.getUTCFullYear(), month0: d.getUTCMonth(), day: d.getUTCDate() };
      }),
    next: () =>
      setCursor((c) => {
        const d = new Date(Date.UTC(c.year, c.month0, c.day + 7));
        return { year: d.getUTCFullYear(), month0: d.getUTCMonth(), day: d.getUTCDate() };
      }),
    today: () => {
      const p = toParisParts(new Date());
      setCursor(mondayOf(p.year, p.month - 1, p.day));
    },
  }));

  const todayKey = useMemo(() => parisDateKey(new Date()), []);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.UTC(cursor.year, cursor.month0, cursor.day + i));
        return {
          key: keyOf(cursor.year, cursor.month0, cursor.day + i),
          dayNumber: d.getUTCDate(),
          isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
        };
      }),
    [cursor],
  );

  const dayKeySet = useMemo(() => new Set(days.map((d) => d.key)), [days]);

  const postsByDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of posts) {
      const key = parisDateKey(p.scheduledAt);
      if (!dayKeySet.has(key)) continue;
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return m;
  }, [posts, dayKeySet]);

  // Plage horaire : 08h–18h par défaut, étendue si un post de la semaine tombe
  // hors de cette plage (jamais de post masqué).
  const { startHour, endHour } = useMemo(() => {
    let min = DEFAULT_START_HOUR;
    let max = DEFAULT_END_HOUR;
    for (const arr of postsByDay.values()) {
      for (const p of arr) {
        const h = toParisParts(p.scheduledAt).hour;
        min = Math.min(min, Math.floor(h / 2) * 2);
        max = Math.max(max, Math.ceil((h + 1) / 2) * 2);
      }
    }
    return { startHour: min, endHour: max };
  }, [postsByDay]);

  const slots = useMemo(() => {
    const out: number[] = [];
    for (let h = startHour; h < endHour; h += 2) out.push(h);
    return out;
  }, [startHour, endHour]);

  const postsBySlot = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const [dayKey, arr] of postsByDay) {
      for (const p of arr) {
        const h = toParisParts(p.scheduledAt).hour;
        const slot = Math.floor(h / 2) * 2;
        const k = `${dayKey}|${slot}`;
        const list = m.get(k) ?? [];
        list.push(p);
        m.set(k, list);
      }
    }
    return m;
  }, [postsByDay]);

  const keyDateByDay = useMemo(() => {
    const m = new Map<string, KeyDateMarker>();
    for (const k of keyDates) m.set(k.date, k);
    return m;
  }, [keyDates]);

  useEffect(() => {
    const first = days[0]!;
    const last = days[days.length - 1]!;
    const start = parisWallTimeToUtc({
      year: cursor.year,
      month: cursor.month0 + 1,
      day: cursor.day,
      hour: 0,
      minute: 0,
    });
    const [ly, lm, ld] = last.key.split('-').map(Number) as [number, number, number];
    const endDay = new Date(Date.UTC(ly, lm - 1, ld + 1));
    const end = parisWallTimeToUtc({
      year: endDay.getUTCFullYear(),
      month: endDay.getUTCMonth() + 1,
      day: endDay.getUTCDate(),
      hour: 0,
      minute: 0,
    });
    const [fy, fm, fd] = first.key.split('-').map(Number) as [number, number, number];
    onRangeChange?.({
      title: formatWeekTitle({ year: fy, month0: fm - 1, day: fd }, last.dayNumber, lm - 1, ly),
      start,
      end,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, days]);

  function handleCreateAt(dayKey: string, slot: number) {
    if (!onCreateAt) return;
    const [y, m, d] = dayKey.split('-').map(Number) as [number, number, number];
    onCreateAt(parisWallTimeToUtc({ year: y, month: m, day: d, hour: slot, minute: 0 }).toISOString());
  }

  function handleDrop(dayKey: string, slot: number) {
    setDragOver(null);
    const id = draggedId;
    setDraggedId(null);
    if (!id) return;
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const [y, m, d] = dayKey.split('-').map(Number) as [number, number, number];
    const scheduledAt = parisWallTimeToUtc({ year: y, month: m, day: d, hour: slot, minute: 0 }).toISOString();
    if (scheduledAt === post.scheduledAt) return;
    reschedule.mutate({ id, scheduledAt });
  }

  return (
    <div className="surface-card flex h-full flex-col overflow-hidden rounded-[20px] p-4">
      <div className="grid grid-cols-[66px_repeat(7,minmax(0,1fr))] gap-2">
        <div />
        {days.map((d, i) => {
          const count = postsByDay.get(d.key)?.length ?? 0;
          const kd = keyDateByDay.get(d.key);
          return (
            <div key={d.key} className="flex items-center gap-1 px-1 pb-1">
              <span
                className={`text-[11px] font-extrabold uppercase tracking-[0.07em] ${
                  d.isWeekend ? 'text-ink-faint' : 'text-foreground/75'
                }`}
              >
                {WEEKDAY_HEADERS[i]}
              </span>
              <span
                className={`text-[13px] font-extrabold tabular-nums ${
                  d.key === todayKey
                    ? 'bg-primary text-primary-foreground rounded-full px-1.5'
                    : d.isWeekend
                      ? 'text-ink-faint'
                      : 'text-foreground'
                }`}
              >
                {d.dayNumber}
              </span>
              {kd && (
                <span
                  className="bg-keydate-surface text-keydate-strong ml-auto truncate rounded-[6px] px-1 py-0.5 text-[9px] font-bold"
                  title={kd.name}
                >
                  {kd.name}
                </span>
              )}
              {!kd && (
                <span
                  className={`ml-auto shrink-0 text-[10.5px] font-[750] ${
                    count > 0 ? '' : 'text-ink-faint'
                  }`}
                  style={count > 0 ? { color: 'oklch(0.5 0.16 264)' } : undefined}
                >
                  {count > 0 ? count : '—'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {slots.map((slot) => (
          <div key={slot} className="grid grid-cols-[66px_repeat(7,minmax(0,1fr))] gap-2">
            <div className="text-ink-faint flex items-start justify-end pt-1.5 text-[11px] font-extrabold">
              {pad(slot)}–{pad(slot + 2)}
            </div>
            {days.map((d) => {
              const key = `${d.key}|${slot}`;
              const cellPosts = postsBySlot.get(key) ?? [];
              const isOver = dragOver?.dayKey === d.key && dragOver.slot === slot;
              return (
                <div
                  key={d.key}
                  role={onCreateAt ? 'button' : undefined}
                  tabIndex={onCreateAt ? 0 : undefined}
                  aria-label={onCreateAt ? `Créer un post le ${d.dayNumber} à ${pad(slot)}h` : undefined}
                  onClick={() => handleCreateAt(d.key, slot)}
                  onKeyDown={(e) => {
                    if (!onCreateAt || e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCreateAt(d.key, slot);
                    }
                  }}
                  onDragOver={
                    editable
                      ? (e) => {
                          e.preventDefault();
                          setDragOver({ dayKey: d.key, slot });
                        }
                      : undefined
                  }
                  onDragLeave={editable ? () => setDragOver(null) : undefined}
                  onDrop={
                    editable
                      ? (e) => {
                          e.preventDefault();
                          handleDrop(d.key, slot);
                        }
                      : undefined
                  }
                  className="flex min-h-[78px] flex-col gap-[5px] rounded-[15px] p-1.5"
                  style={{
                    background: d.isWeekend ? 'oklch(0.982 0.004 265)' : 'oklch(0.988 0.003 265)',
                    outline: isOver ? '2px dashed var(--primary)' : undefined,
                    outlineOffset: isOver ? '-2px' : undefined,
                  }}
                >
                  {cellPosts.map((p) => (
                    <WeekPostCard
                      key={p.id}
                      post={p}
                      clientName={clientName(p.clientId)}
                      onOpen={() => onOpen(p)}
                      draggable={editable}
                      onDragStart={() => setDraggedId(p.id)}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOver(null);
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});
