import { useEffect } from 'react';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { IntroCarousel } from './IntroCarousel';
import { InterfaceTour } from './InterfaceTour';
import { markIntroSeen, tourStore, useTourPhase } from './tourStore';

/**
 * Monté une fois dans l'espace agence. Affiche à la première connexion le
 * carrousel de présentation, et pilote la visite guidée en surbrillance.
 * Relançable depuis l'Aide via `tourStore`.
 */
export function OnboardingHost() {
  const { data: me } = useCurrentProfile();
  const phase = useTourPhase();
  const internal = me ? isInternalRole(me.role) : false;

  useEffect(() => {
    if (internal) tourStore.maybeAutoStart();
  }, [internal]);

  if (!internal) return null;

  return (
    <>
      <IntroCarousel
        open={phase === 'intro'}
        onClose={() => {
          markIntroSeen();
          tourStore.close();
        }}
        onStartTour={() => {
          markIntroSeen();
          tourStore.openTour();
        }}
      />
      <InterfaceTour open={phase === 'tour'} onClose={() => tourStore.close()} />
    </>
  );
}
