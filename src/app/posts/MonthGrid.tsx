import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { parisDateKey, parisWallTimeToUtc, toParisParts } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { DayCell } from './DayCell';
import { WeekSummaryCell } from './WeekSummaryCell';
import { MONTH_NAMES } from './monthNames';
import { useReschedulePost } from './usePosts';

interface KeyDateMarker {
  id: string;
  date: string;
  name: string;
}

export interface MonthGridHandle {
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

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Clé `YYYY-MM-DD` d'un jour de grille, en gérant nativement le débordement (jour 0, 32…). */
function keyOf(year: number, month0: number, day: number): string {
  const d = new Date(Date.UTC(year, month0, day));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function getISOWeek(year: number, month0: number, day: number): number {
  const date = new Date(Date.UTC(year, month0, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Grille du Mois, en CSS Grid pur (pas de librairie de calendrier) — pour un
 * contrôle pixel-exact sur la maquette : cellules, tuile Semaine, dégradés.
 * Reste alignée sur les mêmes conventions que le reste de l'app (jours en
 * `parisDateKey`, heures en Europe/Paris via `parisWallTimeToUtc`).
 */
export const MonthGrid = forwardRef<MonthGridHandle, Props>(function MonthGrid(
  { posts, clientName, onOpen, onCreateAt, keyDates = [], editable, onRangeChange },
  ref,
) {
  const [cursor, setCursor] = useState(() => {
    const p = toParisParts(new Date());
    return { year: p.year, month0: p.month - 1 };
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const reschedule = useReschedulePost();

  useImperativeHandle(ref, () => ({
    prev: () =>
      setCursor((c) => {
        const d = new Date(Date.UTC(c.year, c.month0 - 1, 1));
        return { year: d.getUTCFullYear(), month0: d.getUTCMonth() };
      }),
    next: () =>
      setCursor((c) => {
        const d = new Date(Date.UTC(c.year, c.month0 + 1, 1));
        return { year: d.getUTCFullYear(), month0: d.getUTCMonth() };
      }),
    today: () => {
      const p = toParisParts(new Date());
      setCursor({ year: p.year, month0: p.month - 1 });
    },
  }));

  const todayKey = useMemo(() => parisDateKey(new Date()), []);

  const grid = useMemo(() => {
    const { year, month0 } = cursor;
    const firstOfMonth = new Date(Date.UTC(year, month0, 1));
    const isoDow = firstOfMonth.getUTCDay() || 7; // 1=lun..7=dim
    const leading = isoDow - 1;
    const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
    const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

    const days = Array.from({ length: totalCells }, (_, i) => {
      const dayOffset = i - leading + 1;
      const d = new Date(Date.UTC(year, month0, dayOffset));
      return {
        key: keyOf(year, month0, dayOffset),
        dayNumber: d.getUTCDate(),
        inMonth: d.getUTCMonth() === month0,
        isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
      };
    });

    const weeks: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    return { days, weeks };
  }, [cursor]);

  const postsByDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of posts) {
      const key = parisDateKey(p.scheduledAt);
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return m;
  }, [posts]);

  const keyDateByDay = useMemo(() => {
    const m = new Map<string, KeyDateMarker>();
    for (const k of keyDates) m.set(k.date, k);
    return m;
  }, [keyDates]);

  // Signale la période affichée au parent (filtre « posts ce mois », etc.) —
  // mêmes bornes que l'ancienne grille FullCalendar : du premier jour montré
  // (lundi de la semaine du 1er) au lendemain du dernier jour montré.
  useEffect(() => {
    const first = grid.days[0];
    const last = grid.days[grid.days.length - 1];
    if (!first || !last) return;
    const [sy, sm, sd] = first.key.split('-').map(Number) as [number, number, number];
    const [ey, em, ed] = last.key.split('-').map(Number) as [number, number, number];
    const start = parisWallTimeToUtc({ year: sy, month: sm, day: sd, hour: 0, minute: 0 });
    const endDay = new Date(Date.UTC(ey, em - 1, ed + 1));
    const end = parisWallTimeToUtc({
      year: endDay.getUTCFullYear(),
      month: endDay.getUTCMonth() + 1,
      day: endDay.getUTCDate(),
      hour: 0,
      minute: 0,
    });
    onRangeChange?.({
      title: `${MONTH_NAMES[cursor.month0]} ${cursor.year}`,
      start,
      end,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, cursor]);

  function handleCreateAt(dateKey: string) {
    if (!onCreateAt) return;
    const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
    onCreateAt(parisWallTimeToUtc({ year: y, month: m, day: d, hour: 10, minute: 0 }).toISOString());
  }

  function handleDropPost(dateKey: string) {
    setDragOverKey(null);
    const id = draggedId;
    setDraggedId(null);
    if (!id) return;
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const orig = toParisParts(post.scheduledAt);
    const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
    if (parisDateKey(post.scheduledAt) === dateKey) return;
    const scheduledAt = parisWallTimeToUtc({
      year: y,
      month: m,
      day: d,
      hour: orig.hour,
      minute: orig.minute,
    }).toISOString();
    reschedule.mutate({ id, scheduledAt });
  }

  return (
    <div className="surface-card flex h-full flex-col overflow-hidden rounded-[20px] p-4">
      <div className="grid grid-cols-7 gap-2 min-[1100px]:grid-cols-[repeat(7,minmax(0,1fr))_124px]">
        {WEEKDAY_HEADERS.map((label, i) => (
          <div
            key={label}
            className={`px-1 pb-1 text-[11px] font-extrabold uppercase tracking-[0.07em] ${
              i >= 5 ? 'text-ink-faint' : 'text-foreground/75'
            }`}
          >
            {label}
          </div>
        ))}
        <div className="text-ink-faint hidden px-1 pb-1 text-right text-[11px] font-extrabold uppercase tracking-[0.07em] min-[1100px]:block">
          Semaine
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {grid.weeks.map((week) => {
          const weekTotal = week.reduce((s, d) => s + (postsByDay.get(d.key)?.length ?? 0), 0);
          const weekdayCounts = week.slice(0, 5).map((d) => postsByDay.get(d.key)?.length ?? 0);
          const [wy, wm, wd] = week[0]!.key.split('-').map(Number) as [number, number, number];
          const weekNumber = getISOWeek(wy, wm - 1, wd);
          return (
            <div
              key={week[0]!.key}
              className="grid grid-cols-7 gap-2 min-[1100px]:grid-cols-[repeat(7,minmax(0,1fr))_124px]"
            >
              {week.map((day) => (
                <DayCell
                  key={day.key}
                  dateKey={day.key}
                  dayNumber={day.dayNumber}
                  inMonth={day.inMonth}
                  isWeekend={day.isWeekend}
                  isToday={day.key === todayKey}
                  posts={postsByDay.get(day.key) ?? []}
                  keyDate={keyDateByDay.get(day.key)}
                  clientName={clientName}
                  onOpen={onOpen}
                  onCreateAt={onCreateAt ? handleCreateAt : undefined}
                  editable={editable}
                  dragOver={dragOverKey === day.key}
                  onDragStartPost={setDraggedId}
                  onDragEndPost={() => {
                    setDraggedId(null);
                    setDragOverKey(null);
                  }}
                  onDragOverDay={setDragOverKey}
                  onDropPost={handleDropPost}
                />
              ))}
              <div className="hidden min-[1100px]:block">
                <WeekSummaryCell weekNumber={weekNumber} total={weekTotal} counts={weekdayCounts} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
