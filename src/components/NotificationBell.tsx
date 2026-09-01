import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CircleCheck,
  MessageSquare,
  RotateCcw,
  Send,
  TriangleAlert,
} from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationType } from '@/shared/types';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '@/app/notifications/useNotifications';

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.round(diff / 3_600_000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d <= 1 ? 'hier' : `il y a ${d} j`;
}

const ICONS: Partial<Record<NotificationType, typeof Bell>> = {
  post_submitted: Send,
  post_internal_approved: CircleCheck,
  post_returned: RotateCcw,
  post_client_approved: CircleCheck,
  post_client_rejected: RotateCcw,
  post_awaiting_client: Send,
  comment_client: MessageSquare,
  comment_agency: MessageSquare,
  comment_internal: MessageSquare,
  job_failed: TriangleAlert,
};

interface Props {
  /** Où mène un clic sur une notification. */
  hrefFor: (n: AppNotification) => string;
  /** Alignement du panneau (sidebar verticale : `start`). */
  align?: 'start' | 'end' | 'center';
}

export function NotificationBell({ hrefFor, align = 'start' }: Props) {
  const [open, setOpen] = useState(false);
  const list = useNotifications(open);
  const count = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const navigate = useNavigate();

  const unread = count.data ?? 0;
  const items = list.data ?? [];

  function openItem(n: AppNotification) {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    navigate(hrefFor(n));
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ''}`}
          className="text-muted-foreground hover:bg-surface-2 hover:text-foreground relative rounded-lg p-2 transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {unread > 0 && (
            <span className="bg-danger text-danger-foreground absolute -right-0.5 -top-0.5 min-w-[1.05rem] rounded-full px-1 text-center text-[10px] font-semibold leading-[1.05rem]">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={8}
          className="bg-surface shadow-panel z-dropdown data-[state=open]:animate-in data-[state=open]:fade-in-0 w-[min(22rem,92vw)] overflow-hidden rounded-xl border p-0"
        >
          <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {list.isLoading ? (
              <p className="text-muted-foreground p-6 text-center text-sm">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">Rien de neuf.</p>
            ) : (
              <ul className="divide-border/60 divide-y">
                {items.map((n) => {
                  const Icon = ICONS[n.type] ?? Bell;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className={cn(
                          'hover:bg-surface-2 flex w-full items-start gap-3 px-4 py-3 text-left text-sm',
                          !n.readAt && 'bg-primary-surface/40',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                            n.readAt
                              ? 'bg-surface-2 text-muted-foreground'
                              : 'bg-primary-surface text-primary-strong',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug">{n.body}</span>
                          <span className="text-muted-foreground text-xs">
                            {relative(n.createdAt)}
                          </span>
                        </span>
                        {!n.readAt && (
                          <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
