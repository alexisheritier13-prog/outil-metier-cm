import { useSyncExternalStore } from 'react';

/**
 * Petit magasin (hors React) pour piloter le didacticiel de l'espace agence :
 * - « intro » : carrousel modal montré une fois à la première connexion, et
 *   relançable depuis l'Aide ;
 * - « tour » : visite guidée en surbrillance des vraies zones de l'interface.
 *
 * L'état « déjà vu » est stocké en `localStorage` (par appareil, suffisant pour
 * un simple onboarding ; pas de migration DB).
 */

export const TOUR_VERSION = 1;
const SEEN_KEY = `cadence.onboarding.intro.v${TOUR_VERSION}`;
const DESKTOP_QUERY = '(min-width: 1024px)';

export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'done';
  } catch {
    return true; // stockage indisponible : ne pas harceler
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, 'done');
  } catch {
    /* ignore */
  }
}

function isDesktop(): boolean {
  try {
    return window.matchMedia(DESKTOP_QUERY).matches;
  } catch {
    return true;
  }
}

type Phase = 'idle' | 'intro' | 'tour';

let phase: Phase = 'idle';
const listeners = new Set<() => void>();

function set(next: Phase) {
  if (next === phase) return;
  phase = next;
  listeners.forEach((l) => l());
}

export const tourStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getPhase: () => phase,
  /** Ouvre le carrousel d'intro. */
  openIntro() {
    set('intro');
  },
  /**
   * Lance la visite guidée. Sur petit écran la barre latérale est masquée : on
   * retombe alors sur le carrousel, autonome.
   */
  openTour() {
    set(isDesktop() ? 'tour' : 'intro');
  },
  close() {
    set('idle');
  },
  /** À appeler au démarrage : montre l'intro si jamais vue. */
  maybeAutoStart() {
    if (phase === 'idle' && !hasSeenIntro()) set('intro');
  },
};

export function useTourPhase(): Phase {
  return useSyncExternalStore(tourStore.subscribe, tourStore.getPhase, () => 'idle');
}
