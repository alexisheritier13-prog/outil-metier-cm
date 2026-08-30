import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { ROLE_LABELS } from '@/shared/constants/roles';
import type { Profile } from '@/shared/types';
import { CreateUserDialog } from './CreateUserDialog';
import { AssignClientsDialog } from './AssignClientsDialog';
import { useInternalUsers, useSetActive, useUpdateRole } from './useUsersAdmin';
import type { InternalRole } from '@/services/users';

export function UsersPage() {
  const users = useInternalUsers();
  const { data: me } = useCurrentProfile();
  const updateRole = useUpdateRole();
  const setActive = useSetActive();
  const [assignFor, setAssignFor] = useState<Profile | null>(null);

  if (users.isLoading) return <FullPageSpinner />;
  if (users.isError) {
    return <p className="text-destructive p-8">Impossible de charger les utilisateurs.</p>;
  }

  return (
    <section className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">
            Comptes internes de l'agence. La désactivation empêche la connexion et retire
            l'utilisateur des sélecteurs, sans effacer son historique.
          </p>
        </div>
        <CreateUserDialog />
      </header>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">Nom</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Rôle</th>
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3 font-medium">Clients</th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u) => {
              const isSelf = u.id === me?.id;
              return (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.fullName || <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <select
                      className="border-input bg-background h-8 rounded border px-2"
                      value={u.role}
                      disabled={isSelf || updateRole.isPending}
                      onChange={(e) =>
                        updateRole.mutate({ id: u.id, role: e.target.value as InternalRole })
                      }
                      aria-label={`Rôle de ${u.email}`}
                    >
                      <option value="cm">{ROLE_LABELS.cm}</option>
                      <option value="lead">{ROLE_LABELS.lead}</option>
                      <option value="admin">{ROLE_LABELS.admin}</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        u.isActive
                          ? 'inline-flex items-center gap-1 text-green-700'
                          : 'text-muted-foreground inline-flex items-center gap-1'
                      }
                    >
                      {u.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAssignFor(u)}
                        disabled={u.role === 'admin'}
                        title={u.role === 'admin' ? 'Les admins voient tous les clients' : undefined}
                      >
                        Assignations
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSelf || setActive.isPending}
                        onClick={() => setActive.mutate({ id: u.id, isActive: !u.isActive })}
                      >
                        {u.isActive ? 'Désactiver' : 'Activer'}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AssignClientsDialog user={assignFor} onClose={() => setAssignFor(null)} />
    </section>
  );
}
