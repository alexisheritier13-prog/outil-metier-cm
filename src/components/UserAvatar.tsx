import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' };

/** Photo de profil ronde, avec repli sur les initiales si l'URL manque ou casse. */
export function UserAvatar({ name, avatarUrl, size = 'md', className }: Props) {
  const [broken, setBroken] = useState(false);
  const initials = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={cn(
        'bg-primary-surface text-primary-strong ring-border/60 inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-1',
        SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      {avatarUrl && !broken ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
