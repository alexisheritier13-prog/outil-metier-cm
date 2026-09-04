/**
 * Couleur stable par client, dérivée d'un hash de son id (jamais codée en dur).
 * Sert aux avatars à initiales et aux pastilles du planning — un même client a
 * toujours la même teinte, sans stockage supplémentaire.
 */
export interface ClientColor {
  /** Aplat plein (pastille, initiales sur fond coloré). */
  color: string;
  /** Fond très doux (carte, pilule au repos). */
  soft: string;
  /** Texte/icône sur `soft`, contraste vérifié. */
  ink: string;
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export function clientColor(id: string): ClientColor {
  const hue = hueFromId(id);
  return {
    color: `oklch(0.58 0.15 ${hue})`,
    soft: `oklch(0.93 0.05 ${hue})`,
    ink: `oklch(0.4 0.13 ${hue})`,
  };
}

/** Initiales (1-2 lettres) à partir des premiers mots d'un nom — pour les pastilles colorées. */
export function clientInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
