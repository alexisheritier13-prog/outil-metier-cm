/** Déclenche le téléchargement d'un fichier texte généré côté client. */
export function downloadTextFile(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Laisse le temps au navigateur d'amorcer le téléchargement avant de révoquer.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
