# Tests d'intégration (base de données)

Ces tests s'exécutent contre une **instance Supabase réelle** et provisionnent de vrais
utilisateurs auth (via la clé `service_role`) pour vérifier les policies RLS.

Ils sont **ignorés automatiquement** si :

- `.env.test.local` n'est pas présent (cas de la CI), ou
- la migration correspondant à la suite n'est pas encore appliquée (garde `tableExists`).

## Configuration locale

`.env.test.local` (déjà gitignored) :

```
SUPABASE_TEST_URL=https://<ref>.supabase.co
SUPABASE_TEST_ANON_KEY=<clé publishable / anon>
SUPABASE_TEST_SERVICE_ROLE_KEY=<clé service_role secret>
SUPABASE_ACCESS_TOKEN=<jeton perso, pour db:apply / gen:types>
SUPABASE_PROJECT_REF=<ref>
```

## Lancer

```bash
npm run db:apply      # s'assurer que le schéma est à jour
npm run test:rls      # = vitest run tests/integration
```

## Nettoyage des orphelins

Si un run échoue en plein `beforeAll`, des utilisateurs `test+...@example.test` peuvent
rester. Pour les purger :

```bash
node --input-type=module -e '
import { createClient } from "@supabase/supabase-js";
const a = createClient(process.env.SUPABASE_TEST_URL, process.env.SUPABASE_TEST_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
for (const u of data.users.filter(x => (x.email||"").includes("@example.test"))) await a.auth.admin.deleteUser(u.id);
console.log("nettoyé");
'
```
