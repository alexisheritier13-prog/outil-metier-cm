import { CalendarDays, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { NetworkIcon } from '@/components/NetworkIcon';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';
import { StatusControl } from './StatusControl';
import { useTrashPost } from './usePosts';

interface Props {
  posts: Post[];
  role: Role;
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  hasClients: boolean;
}

export function PostsTable({ posts, role, clientName, onOpen, hasClients }: Props) {
  const trash = useTrashPost();

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Aucun post"
        description={
          hasClients
            ? 'Créez le premier post pour commencer à planifier.'
            : "Créez d'abord un client, puis planifiez son premier post."
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left">
          <tr>
            <th className="p-3 font-medium">Date</th>
            <th className="p-3 font-medium">Client</th>
            <th className="p-3 font-medium">Réseau</th>
            <th className="p-3 font-medium">Légende</th>
            <th className="p-3 font-medium">Statut</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr
              key={p.id}
              className="hover:bg-surface-2/60 cursor-pointer border-t"
              onClick={() => onOpen(p)}
            >
              <td className="p-3 whitespace-nowrap">
                {parisDateKey(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
              </td>
              <td className="p-3">{clientName(p.clientId)}</td>
              <td className="p-3">
                <NetworkIcon network={p.network} />
              </td>
              <td className="text-muted-foreground max-w-md truncate p-3">
                {p.caption || <span className="italic">Sans légende</span>}
              </td>
              <td className="p-3">
                <StatusControl postId={p.id} status={p.status} role={role} />
              </td>
              <td className="p-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Mettre à la corbeille"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Mettre ce post à la corbeille ?')) trash.mutate(p.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
