/**
 * Rôles utilisateur. Les **clés** (`cm` / `lead` / `admin` / `client`) doivent
 * rester alignées avec l'enum SQL `role_t` et toutes les policies RLS ; seuls les
 * libellés d'affichage évoluent.
 *
 * `admin` = Directeur · `lead` = Chef de projet · `cm` = CM. Le mode « CM seul »
 * (Paramètres → Circuit de validation) sert au freelance solo : il est Directeur
 * et n'a pas de validation interne à faire.
 */
export const ROLES = ['cm', 'lead', 'admin', 'client'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  cm: 'CM',
  lead: 'Chef de projet',
  admin: 'Directeur',
  client: 'Client',
};

/** Rôles internes à l'agence (tout sauf `client`). */
export const INTERNAL_ROLES = ['cm', 'lead', 'admin'] as const satisfies readonly Role[];

export function isInternalRole(role: Role): boolean {
  return (INTERNAL_ROLES as readonly Role[]).includes(role);
}
