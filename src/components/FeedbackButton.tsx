import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FormBody,
  FormField,
  FormFooter,
  FormSheet,
  selectClass,
  textareaClass,
} from '@/components/form';
import { cn } from '@/lib/utils';
import {
  FEEDBACK_KIND_LABELS,
  submitFeedback,
  type FeedbackKind,
} from '@/services/feedback';

/**
 * Bouton « Faire un retour » — envoie un feedback (bug / idée / autre) à
 * l'équipe. Dispo pour tout le monde (agence + portail). Capture la page courante.
 */
export function FeedbackButton({
  className,
  compact = false,
}: {
  className?: string;
  /** Bouton icône seule (en-tête portail). */
  compact?: boolean;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [message, setMessage] = useState('');

  const send = useMutation({
    mutationFn: () => submitFeedback(kind, message, location.pathname + location.search),
  });

  function close() {
    setOpen(false);
    setTimeout(() => {
      setMessage('');
      setKind('idea');
      send.reset();
    }, 200);
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Faire un retour"
          className={cn(
            'text-muted-foreground hover:bg-surface-2 hover:text-foreground rounded-md p-2',
            className,
          )}
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
            className,
          )}
        >
          <MessageSquarePlus className="h-[18px] w-[18px] shrink-0" />
          Faire un retour
        </button>
      )}

      <FormSheet
        open={open}
        onOpenChange={(v) => (v ? setOpen(true) : close())}
        title="Faire un retour"
        description="Un bug, une idée, un truc pas clair ? Dis-nous tout, ça aide à améliorer Cadence."
      >
        {send.isSuccess ? (
          <>
            <FormBody>
              <p className="text-sm">Merci ! C'est bien envoyé. 🙏</p>
            </FormBody>
            <FormFooter>
              <Button onClick={close}>Fermer</Button>
            </FormFooter>
          </>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) send.mutate();
            }}
          >
            <FormBody>
              <FormField label="Type" htmlFor="fb-kind">
                <select
                  id="fb-kind"
                  className={selectClass}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as FeedbackKind)}
                >
                  {(Object.keys(FEEDBACK_KIND_LABELS) as FeedbackKind[]).map((k) => (
                    <option key={k} value={k}>
                      {FEEDBACK_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Message" htmlFor="fb-msg">
                <textarea
                  id="fb-msg"
                  className={cn(textareaClass, 'min-h-32')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ce qui s'est passé, ce que tu attendais, ton idée…"
                />
              </FormField>
              {send.isError && (
                <p className="text-destructive text-sm" role="alert">
                  L'envoi a échoué. Réessaie.
                </p>
              )}
            </FormBody>
            <FormFooter>
              <Button type="button" variant="ghost" onClick={close}>
                Annuler
              </Button>
              <Button type="submit" disabled={send.isPending || !message.trim()}>
                {send.isPending ? 'Envoi…' : 'Envoyer'}
              </Button>
            </FormFooter>
          </form>
        )}
      </FormSheet>
    </>
  );
}
