import { describe, expect, it } from 'vitest';
import { resolveActiveNetworks } from '@/services/accountSettings';
import { NETWORKS } from '@/shared/constants/networks';

describe('resolveActiveNetworks', () => {
  it('null / vide => tous les réseaux', () => {
    expect(resolveActiveNetworks(null)).toEqual([...NETWORKS]);
    expect(resolveActiveNetworks([])).toEqual([...NETWORKS]);
    expect(resolveActiveNetworks(undefined)).toEqual([...NETWORKS]);
  });

  it('sous-ensemble => filtré, dans l’ordre canonique', () => {
    expect(resolveActiveNetworks(['linkedin', 'instagram'])).toEqual(['instagram', 'linkedin']);
  });

  it('valeurs inconnues ignorées', () => {
    expect(resolveActiveNetworks(['instagram', 'myspace'])).toEqual(['instagram']);
  });

  it('aucune valeur valide => repli sur tous (jamais vide)', () => {
    expect(resolveActiveNetworks(['myspace'])).toEqual([...NETWORKS]);
  });
});
