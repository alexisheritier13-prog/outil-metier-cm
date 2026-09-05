import { clientColor, clientInitials } from '@/lib/clientColor';
import { parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { EVENT_CARD_CLASSES } from './eventCardTone';

interface Props {
  post: Post;
  clientName: string;
  onOpen: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/** Carte événement d'un jour du planning — pastille client, heure, légende. */
export function EventChip({ post, clientName, onOpen, draggable, onDragStart, onDragEnd }: Props) {
  const cc = clientColor(post.clientId);
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      title={`${clientName} — ${post.caption || 'Sans légende'}`}
      className={`flex w-full items-center gap-[5px] overflow-hidden rounded-[9px] py-1 pl-1 pr-[7px] text-left ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${EVENT_CARD_CLASSES[post.status]}`}
    >
      <span
        className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] text-[7.5px] font-extrabold text-white"
        style={{ backgroundColor: cc.color }}
        aria-hidden="true"
      >
        {clientInitials(clientName)[0]}
      </span>
      <span className="shrink-0 text-[10.5px] font-[750] tabular-nums opacity-80">
        {parisTimeLabel(post.scheduledAt)}
      </span>
      <span className="truncate text-[11.5px] font-[650]">
        {post.caption || 'Sans légende'}
      </span>
    </button>
  );
}
