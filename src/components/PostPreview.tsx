import { useState } from 'react';
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NetworkIcon } from '@/components/NetworkIcon';
import { mediaUrl } from '@/services/postMedia';
import type { Network } from '@/shared/constants/networks';
import type { PostMediaKind } from '@/shared/types';
import { parisDateLabel } from '@/shared/utils/tz';

type PreviewMedia = { storagePath: string; kind: PostMediaKind };

interface Props {
  network: Network;
  name: string;
  logoUrl?: string | null;
  handle?: string | null;
  caption: string;
  media: PreviewMedia[];
  scheduledAt: string;
  className?: string;
}

/** Rendu approximatif d'un post tel qu'il apparaîtra sur le réseau. */
export function PostPreview(props: Props) {
  const style: 'instagram' | 'linkedin' | 'facebook' | 'generic' =
    props.network === 'instagram'
      ? 'instagram'
      : props.network === 'linkedin'
        ? 'linkedin'
        : props.network === 'facebook'
          ? 'facebook'
          : 'generic';

  return (
    <div
      className={cn(
        'bg-surface mx-auto w-full max-w-sm overflow-hidden rounded-xl border text-sm',
        props.className,
      )}
    >
      {style === 'instagram' ? (
        <Instagram {...props} />
      ) : style === 'linkedin' || style === 'facebook' ? (
        <Feed {...props} />
      ) : (
        <Generic {...props} />
      )}
    </div>
  );
}

function Avatar({ name, logoUrl, size = 32 }: { name: string; logoUrl?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className="bg-surface-2 text-muted-foreground grid shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-semibold"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {logoUrl && !broken ? (
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}

function Media({ media }: { media: PreviewMedia[] }) {
  const first = media[0];
  if (!first) {
    return (
      <div className="bg-surface-2 text-muted-foreground grid aspect-square place-items-center text-xs">
        Aucun visuel
      </div>
    );
  }
  return (
    <div className="bg-surface-3 relative">
      {first.kind === 'image' ? (
        <img
          src={mediaUrl(first.storagePath)}
          alt=""
          className="max-h-[420px] w-full object-cover"
        />
      ) : (
        <video
          src={mediaUrl(first.storagePath)}
          className="max-h-[420px] w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}
      {media.length > 1 && (
        <span className="bg-foreground/70 text-background absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium">
          1/{media.length}
        </span>
      )}
    </div>
  );
}

function Caption({ handle, caption }: { handle: string; caption: string }) {
  const [open, setOpen] = useState(false);
  const text = caption.trim() || 'Sans légende';
  return (
    <p className={cn(!open && 'line-clamp-3')}>
      <span className="font-semibold">{handle} </span>
      {text}
      {!open && text.length > 90 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-muted-foreground ml-1 align-baseline"
        >
          … plus
        </button>
      )}
    </p>
  );
}

function Instagram({ name, logoUrl, handle, caption, media, scheduledAt }: Props) {
  const h = (handle || name).replace(/^@/, '');
  return (
    <>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={name} logoUrl={logoUrl} />
        <span className="flex-1 font-semibold">{h}</span>
        <MoreHorizontal className="text-muted-foreground h-4 w-4" aria-hidden="true" />
      </div>
      <Media media={media} />
      <div className="text-foreground flex items-center gap-4 px-3 pt-2.5">
        <Heart className="h-[22px] w-[22px]" aria-hidden="true" />
        <MessageCircle className="h-[22px] w-[22px]" aria-hidden="true" />
        <Send className="h-[22px] w-[22px]" aria-hidden="true" />
        <Bookmark className="ml-auto h-[22px] w-[22px]" aria-hidden="true" />
      </div>
      <div className="space-y-1 px-3 pb-3 pt-2">
        <Caption handle={h} caption={caption} />
        <p className="text-muted-foreground text-[11px] uppercase">{parisDateLabel(scheduledAt)}</p>
      </div>
    </>
  );
}

function Feed({ network, name, logoUrl, caption, media, scheduledAt }: Props) {
  return (
    <>
      <div className="flex items-start gap-2.5 px-3 py-3">
        <Avatar name={name} logoUrl={logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{name}</p>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            {parisDateLabel(scheduledAt)} · <NetworkIcon network={network} monochrome />
          </p>
        </div>
        <MoreHorizontal className="text-muted-foreground h-4 w-4" aria-hidden="true" />
      </div>
      <p className="whitespace-pre-line px-3 pb-3">{caption.trim() || 'Sans légende'}</p>
      {media.length > 0 && <Media media={media} />}
      <div className="text-muted-foreground grid grid-cols-3 border-t text-xs font-medium">
        <span className="flex items-center justify-center gap-1.5 py-2">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" /> J'aime
        </span>
        <span className="flex items-center justify-center gap-1.5 py-2">
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Commenter
        </span>
        <span className="flex items-center justify-center gap-1.5 py-2">
          <Share2 className="h-4 w-4" aria-hidden="true" /> Partager
        </span>
      </div>
    </>
  );
}

function Generic({ network, name, logoUrl, handle, caption, media, scheduledAt }: Props) {
  const h = (handle || name).replace(/^@/, '');
  return (
    <>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={name} logoUrl={logoUrl} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{h}</p>
          <p className="text-muted-foreground text-xs">{parisDateLabel(scheduledAt)}</p>
        </div>
        <NetworkIcon network={network} />
      </div>
      {media.length > 0 && <Media media={media} />}
      <div className="text-muted-foreground flex items-center gap-4 px-3 pt-2.5">
        <Heart className="h-5 w-5" aria-hidden="true" />
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <Repeat2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="whitespace-pre-line px-3 pb-3 pt-2">{caption.trim() || 'Sans légende'}</p>
    </>
  );
}
