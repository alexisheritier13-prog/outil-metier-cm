import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { Page, PageHeader } from '@/components/Page';
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
    return <p className="text-danger-strong p-6">Impossible de charger les utilisateurs.</p>;
  }

  return (
    <Page>
      <PageHeader
        title="Utilisateurs"
        description="Comptes internes de l'agence. La désactivation empêche la connexion et retire l'utilisateur des sélecteurs, sans effacer son historique."
        actions={<CreateUserDialog />}
      />

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-muted-foreground text-left">
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
                      className="field h-8"
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
                          ? 'text-success-strong inline-flex items-center gap-1'
                          : 'text-muted-foreground inline-flex items-center gap-1'
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'h-1.5 w-1.5 rounded-full ' +
                          (u.isActive ? 'bg-success' : 'bg-muted-foreground')
                        }
                      />
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
    </Page>
  );
}
