/** Âge relatif court et lisible (« à l'instant », « il y a 3 h », « hier », « il y a 5 j »). */
export function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.round(diff / 3_600_000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d <= 1 ? 'hier' : `il y a ${d} j`;
}
