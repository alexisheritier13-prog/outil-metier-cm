import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hasSeenIntro, markIntroSeen, tourStore } from '../tourStore';

beforeEach(() => {
  localStorage.clear();
  tourStore.close();
});
afterEach(() => {
  localStorage.clear();
  tourStore.close();
});

describe('tourStore', () => {
  it('mémorise que l’intro a été vue', () => {
    expect(hasSeenIntro()).toBe(false);
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });

  it('maybeAutoStart ouvre l’intro une seule fois', () => {
    tourStore.maybeAutoStart();
    expect(tourStore.getPhase()).toBe('intro');

    tourStore.close();
    markIntroSeen();
    tourStore.maybeAutoStart();
    expect(tourStore.getPhase()).toBe('idle');
  });

  it('notifie les abonnés à chaque changement de phase', () => {
    let hits = 0;
    const unsub = tourStore.subscribe(() => {
      hits += 1;
    });
    tourStore.openIntro();
    tourStore.close();
    unsub();
    tourStore.openIntro();
    expect(hits).toBe(2);
  });

  it('openTour retombe sur l’intro hors desktop (matchMedia matches=false)', () => {
    tourStore.openTour();
    expect(tourStore.getPhase()).toBe('intro');
  });
});
