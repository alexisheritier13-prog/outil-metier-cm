/** Réseaux sociaux gérés. Doit rester aligné avec l'enum SQL `network_t`. */
export const NETWORKS = [
  'instagram',
  'linkedin',
  'facebook',
  'tiktok',
  'x',
  'youtube',
  'pinterest',
  'threads',
] as const;

export type Network = (typeof NETWORKS)[number];

export const NETWORK_LABELS: Record<Network, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  threads: 'Threads',
};

export function isNetwork(value: string): value is Network {
  return (NETWORKS as readonly string[]).includes(value);
}
