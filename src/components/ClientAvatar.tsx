import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'h-6 w-6 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' };

/** Logo du client, avec repli sur les initiales si l'URL est absente ou cassée. */
export function ClientAvatar({ name, logoUrl, size = 'md', className }: Props) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={cn(
        'bg-surface-2 text-muted-foreground inline-flex shrink-0 items-center justify-center overflow-hidden rounded border font-medium',
        SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      {logoUrl && !broken ? (
        <img
          src={logoUrl}
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
