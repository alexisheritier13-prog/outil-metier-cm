import { useState } from 'react';
import { Copy, ListChecks, Trash2, UserRoundCog, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Post, Profile } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';
import { POST_STATUSES, POST_STATUS_LABELS, type PostStatus } from '@/shared/constants/postStatus';
import { anyNeedsComment, summarize } from './bulk';
import { useBulkActions } from './useBulkActions';

interface Props {
  selectedIds: string[];
  /** Résultat filtré courant (sert au « tout sélectionner » et aux libellés du récap). */
  posts: Post[];
  clientName: (id: string) => string;
  role: Role;
  canReassign: boolean;
  authors: Profile[];
  onSelectAll: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedIds,
  posts,
  clientName,
  role,
  canReassign,
  authors,
  onSelectAll,
  onClear,
}: Props) {
  const bulk = useBulkActions({ posts, clientName, role });
  const [statusOpen, setStatusOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  if (selectedIds.length === 0) return null;

  const selectedPosts = posts.filter((p) => selectedIds.includes(p.id));
  const allSelected = selectedIds.length === posts.length;
  const busy = bulk.running !== null;

  function onStatus(to: PostStatus) {
    setStatusOpen(false);
    let comment: string | undefined;
    if (anyNeedsComment(selectedPosts, to)) {
      comment = window.prompt('Un commentaire est requis pour cette action :') ?? undefined;
      if (!comment?.trim()) return;
    }
    void bulk.changeStatus(selectedIds, to, comment);
  }

  function onReassign(authorId: string) {
    setReassignOpen(false);
    void bulk.reassign(selectedIds, authorId);
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-panel flex justify-center px-4">
        <div
          role="region"
          aria-label="Actions groupées"
          className="bg-surface supports-[backdrop-filter]:bg-surface/75 shadow-panel pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl border p-1.5 pl-3 backdrop-blur-md"
        >
          <span className="text-sm font-medium tabular-nums">
            {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={allSelected ? onClear : onSelectAll}
            className="text-primary hover:bg-primary-surface rounded-md px-2 py-1 text-sm font-medium"
          >
            {allSelected ? 'Tout désélectionner' : `Tout sélectionner (${posts.length})`}
          </button>

          <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />

          <Button variant="ghost" size="sm" disabled={busy} onClick={() => bulk.duplicate(selectedIds)}>
            <Copy className="h-4 w-4" /> Dupliquer
          </Button>

          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" disabled={busy}>
                <ListChecks className="h-4 w-4" /> Statut
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-52">
              <p className="text-muted-foreground px-2 py-1.5 text-xs">Passer les posts à…</p>
              {POST_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatus(s)}
                  className="hover:bg-surface-2 flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm"
                >
                  {POST_STATUS_LABELS[s]}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {canReassign && (
            <Popover open={reassignOpen} onOpenChange={setReassignOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={busy}>
                  <UserRoundCog className="h-4 w-4" /> Réassigner
                </Button>
              </PopoverTrigger>
              <PopoverContent align="center" className="max-h-72 w-56 overflow-y-auto">
                <p className="text-muted-foreground px-2 py-1.5 text-xs">Assigner à…</p>
                {authors.length === 0 && (
                  <p className="px-2 py-1.5 text-sm">Aucun utilisateur interne.</p>
                )}
                {authors.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onReassign(a.id)}
                    className="hover:bg-surface-2 flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm"
                  >
                    {a.fullName || a.email}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            className="text-danger-strong hover:bg-danger-surface hover:text-danger-strong"
            onClick={() => {
              if (window.confirm(`Mettre ${selectedIds.length} post(s) à la corbeille ?`)) {
                void bulk.trash(selectedIds);
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Corbeille
          </Button>

          <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Fermer la sélection" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={bulk.report !== null} onOpenChange={(v) => !v && bulk.dismissReport()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Récapitulatif</DialogTitle>
          </DialogHeader>
          {bulk.report && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{summarize(bulk.report)}</p>
              {bulk.report.failures.length > 0 && (
                <ul className="border-danger-border bg-danger-surface max-h-56 space-y-1.5 overflow-y-auto rounded-md border p-3">
                  {bulk.report.failures.map((f) => (
                    <li key={f.postId} className="text-danger-strong">
                      <span className="font-medium">{f.label}</span> — {f.reason}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    bulk.dismissReport();
                    if (bulk.report && bulk.report.failures.length === 0) onClear();
                  }}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
