/** Rôles utilisateur. Doit rester aligné avec l'enum SQL `role_t`. */
export const ROLES = ['cm', 'lead', 'admin', 'client'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  cm: 'Community Manager',
  lead: 'Lead CM',
  admin: 'Admin agence',
  client: 'Client',
};

/** Rôles internes à l'agence (tout sauf `client`). */
export const INTERNAL_ROLES = ['cm', 'lead', 'admin'] as const satisfies readonly Role[];

export function isInternalRole(role: Role): boolean {
  return (INTERNAL_ROLES as readonly Role[]).includes(role);
}
