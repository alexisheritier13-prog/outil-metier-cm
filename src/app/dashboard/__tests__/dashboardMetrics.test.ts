import { describe, expect, it } from 'vitest';
import { pickPriorityAlerts, postStep } from '../dashboardMetrics';
import type { Alert } from '@/shared/types';

describe('postStep', () => {
  it('mappe chaque statut sur son étape (1 à 5, publié plafonné à 5)', () => {
    expect(postStep('draft')).toBe(1);
    expect(postStep('internal_review')).toBe(2);
    expect(postStep('client_review')).toBe(3);
    expect(postStep('approved')).toBe(4);
    expect(postStep('scheduled')).toBe(5);
    expect(postStep('published')).toBe(5);
  });
});

function fakeAlert(partial: Partial<Alert>): Alert {
  return {
    id: partial.id ?? 'a1',
    type: 'validation_overdue',
    severity: 'info',
    clientId: null,
    postId: null,
    targetRole: null,
    targetUserId: null,
    message: 'x',
    status: 'new',
    createdAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('pickPriorityAlerts', () => {
  it('priorise la sévérité critique avant warning et info', () => {
    const alerts = [
      fakeAlert({ id: 'i', severity: 'info' }),
      fakeAlert({ id: 'c', severity: 'critical' }),
      fakeAlert({ id: 'w', severity: 'warning' }),
    ];
    expect(pickPriorityAlerts(alerts, 1).map((a) => a.id)).toEqual(['c']);
  });

  it('à sévérité égale, la plus ancienne en premier', () => {
    const alerts = [
      fakeAlert({ id: 'recent', severity: 'warning', createdAt: '2026-02-01T00:00:00Z', message: 'récent' }),
      fakeAlert({ id: 'old', severity: 'warning', createdAt: '2026-01-01T00:00:00Z', message: 'ancien' }),
    ];
    expect(pickPriorityAlerts(alerts, 2).map((a) => a.id)).toEqual(['old', 'recent']);
  });

  it('respecte la limite demandée', () => {
    const alerts = [
      fakeAlert({ id: '1', message: 'm1' }),
      fakeAlert({ id: '2', message: 'm2' }),
      fakeAlert({ id: '3', message: 'm3' }),
    ];
    expect(pickPriorityAlerts(alerts, 2)).toHaveLength(2);
  });

  it('ne répète jamais deux fois le même message', () => {
    const alerts = [
      fakeAlert({ id: '1', severity: 'critical', message: 'même phrase' }),
      fakeAlert({ id: '2', severity: 'warning', message: 'même phrase' }),
      fakeAlert({ id: '3', severity: 'info', message: 'autre phrase' }),
    ];
    const picked = pickPriorityAlerts(alerts, 2);
    expect(picked.map((a) => a.id)).toEqual(['1', '3']);
  });
});
