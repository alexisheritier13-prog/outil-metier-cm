import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Lightbulb, Search, Users } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { NetworkIcon } from '@/components/NetworkIcon';
import { ClientAvatar } from '@/components/ClientAvatar';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { onOpenGlobalSearch } from '@/lib/appShortcuts';
import { globalSearch } from '@/services/search';
import { parisDateLabel } from '@/shared/utils/tz';

interface Item {
  key: string;
  to: string;
  icon: React.ReactNode;
  label: string;
  sub?: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const debounced = useDebouncedValue(q, 220);

  useEffect(() => onOpenGlobalSearch(() => setOpen(true)), []);
  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const results = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => globalSearch(debounced),
    enabled: open && debounced.trim().length >= 2,
  });

  const items: Item[] = useMemo(() => {
    const r = results.data;
    if (!r) return [];
    return [
      ...r.clients.map((c) => ({
        key: `c-${c.id}`,
        to: `/app/clients/${c.id}`,
        icon: <ClientAvatar name={c.name} logoUrl={c.logoUrl} size="sm" />,
        label: c.name,
        sub: c.sector ?? 'Client',
      })),
      ...r.posts.map((p) => ({
        key: `p-${p.id}`,
        to: `/app/planning?post=${p.id}`,
        icon: <NetworkIcon network={p.network} />,
        label: p.caption?.trim() || 'Post sans légende',
        sub: `Post · ${parisDateLabel(p.scheduledAt)}`,
      })),
      ...r.ideas.map((i) => ({
        key: `i-${i.id}`,
        to: `/app/idees?open=${i.id}`,
        icon: <Lightbulb className="h-4 w-4" aria-hidden="true" />,
        label: i.title,
        sub: 'Idée',
      })),
    ];
  }, [results.data]);

  useEffect(() => setActive(0), [items.length]);

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      go(items[active].to);
    }
  }

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const short = debounced.trim().length > 0 && debounced.trim().length < 2;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-foreground/20 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          className="bg-surface shadow-panel data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-modal fixed left-1/2 top-[12vh] w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border p-0 duration-150 focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Recherche</DialogPrimitive.Title>
          <div className="border-border flex items-center gap-2.5 border-b px-4">
            <Search className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- palette de recherche : le focus immédiat est attendu */}
            <input autoFocus value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un client, un post, une idée…"
              className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
              aria-label="Rechercher"
            />
          </div>

          <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
            {short && (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                Tapez au moins 2 caractères.
              </p>
            )}
            {!short && debounced.trim().length >= 2 && results.isFetching && (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">Recherche…</p>
            )}
            {!short && debounced.trim().length >= 2 && !results.isFetching && items.length === 0 && (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">Aucun résultat.</p>
            )}
            {debounced.trim().length < 1 && (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                Clients, posts, idées. <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> pour naviguer, <kbd className="font-sans">Entrée</kbd> pour ouvrir.
              </p>
            )}

            {items.map((it, i) => (
              <button
                key={it.key}
                type="button"
                data-i={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(it.to)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm',
                  i === active ? 'bg-primary-surface text-primary-strong' : 'hover:bg-surface-2',
                )}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center">{it.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{it.label}</span>
                  {it.sub && <span className="text-muted-foreground block truncate text-xs">{it.sub}</span>}
                </span>
              </button>
            ))}
          </div>

          <div className="text-muted-foreground border-border flex items-center gap-3 border-t px-4 py-2 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> Clients
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> Posts
            </span>
            <span className="inline-flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> Idées
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
