import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SEARCH_EVENT = 'cadence:open-search';

/** Ouvre la recherche globale (depuis un bouton, un raccourci…). */
export function openGlobalSearch(): void {
  window.dispatchEvent(new CustomEvent(SEARCH_EVENT));
}

export function onOpenGlobalSearch(handler: () => void): () => void {
  window.addEventListener(SEARCH_EVENT, handler);
  return () => window.removeEventListener(SEARCH_EVENT, handler);
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable ||
    Boolean(el.closest('[role="dialog"] input, [role="dialog"] textarea'))
  );
}

/** Raccourcis clavier globaux de l'espace agence. */
export function useGlobalShortcuts(): void {
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K / Ctrl+K : recherche (même en saisie)
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openGlobalSearch();
        return;
      }

      if (isTypingTarget(e.target) || e.altKey || meta) return;

      if (e.key === '/') {
        e.preventDefault();
        openGlobalSearch();
      } else if (e.key === 'n') {
        e.preventDefault();
        navigate('/app/planning?new=1');
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
}
