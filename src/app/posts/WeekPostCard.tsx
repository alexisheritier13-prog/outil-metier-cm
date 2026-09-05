import { clientColor, clientInitials } from '@/lib/clientColor';
import { NETWORK_BRAND } from '@/components/networkBrand';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { parisTimeLabel } from '@/shared/utils/tz';
import { POST_STATUS_LABELS, STEP_BAR_COLOR, postStep } from '@/shared/constants/postStatus';
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

/** Carte événement de la vue Semaine — plus riche que l'`EventChip` du Mois : la place le permet. */
export function WeekPostCard({ post, clientName, onOpen, draggable, onDragStart, onDragEnd }: Props) {
  const cc = clientColor(post.clientId);
  const step = postStep(post.status);
  const brand = NETWORK_BRAND[post.network];

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
      className={`flex w-full flex-col gap-[5px] rounded-xl p-[7px_8px] text-left ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${EVENT_CARD_CLASSES[post.status]}`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] text-[8px] font-extrabold text-white"
          style={{ backgroundColor: cc.color }}
          aria-hidden="true"
        >
          {clientInitials(clientName)[0]}
        </span>
        <span className="text-[10.5px] font-extrabold tabular-nums">
          {parisTimeLabel(post.scheduledAt)}
        </span>
        <span
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold"
          style={{ backgroundColor: 'oklch(1 0 0 / 0.6)' }}
        >
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill={brand.hex} aria-hidden="true">
            <path d={brand.path} />
          </svg>
          <span className="sr-only">{NETWORK_LABELS[post.network]}</span>
        </span>
      </div>

      <p className="line-clamp-2 text-[12px] font-[750] leading-[1.3]">
        {post.caption || 'Sans légende'}
      </p>

      <div className="flex items-center gap-1.5">
        <span
          className="h-1 flex-1 overflow-hidden rounded-[3px]"
          style={{ backgroundColor: 'oklch(1 0 0 / 0.55)' }}
        >
          <span
            className="block h-full rounded-[3px]"
            style={{ width: `${(step / 5) * 100}%`, backgroundColor: STEP_BAR_COLOR[post.status] }}
          />
        </span>
        <span className="shrink-0 text-[10px] font-extrabold opacity-70">{step}/5</span>
      </div>
      <span className="sr-only">{POST_STATUS_LABELS[post.status]}</span>
    </button>
  );
}
