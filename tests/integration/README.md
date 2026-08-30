# Tests d'intégration (base de données)

Ces tests s'exécutent contre une **instance Supabase réelle** — locale (`supabase start`,
nécessite Docker) ou un projet cloud dédié aux tests.

Ils sont **ignorés automatiquement** si `SUPABASE_TEST_URL` / `SUPABASE_TEST_ANON_KEY` ne
sont pas définis, pour ne pas casser la CI tant que l'infra n'est pas en place (Story 1.2).

## Lancer en local (quand Docker est disponible)

```bash
supabase start
supabase db reset
export SUPABASE_TEST_URL=http://127.0.0.1:54321
export SUPABASE_TEST_ANON_KEY=<clé anon affichée par `supabase status`>
npx vitest run tests/integration
```
