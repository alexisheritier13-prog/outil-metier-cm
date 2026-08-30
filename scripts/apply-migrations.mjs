#!/usr/bin/env node
/**
 * Applique les migrations `supabase/migrations/*.sql` sur le projet Supabase lié,
 * via l'API Management (endpoint database/query) — pas besoin du mot de passe DB.
 *
 * Env requis (chargés depuis .env.test.local ou l'environnement) :
 *   SUPABASE_ACCESS_TOKEN   jeton d'accès personnel (https://supabase.com/dashboard/account/tokens)
 *   SUPABASE_PROJECT_REF    ref du projet (sous-domaine de l'URL)
 *
 * Les migrations du projet sont écrites de façon idempotente → ré-exécution sans risque.
 * Usage :
 *   node scripts/apply-migrations.mjs            # toutes les migrations, dans l'ordre
 *   node scripts/apply-migrations.mjs 0003       # seulement celles dont le nom commence par 0003
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

for (const file of ['.env.test.local', '.env.local']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* fichier absent : on ignore */
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error('SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF sont requis.');
  process.exit(1);
}

const filter = process.argv[2] ?? '';
const dir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql') && f.startsWith(filter))
  .sort();

if (files.length === 0) {
  console.error(`Aucune migration ${filter ? `commençant par "${filter}" ` : ''}dans ${dir}`);
  process.exit(1);
}

for (const file of files) {
  const sql = readFileSync(join(dir, file), 'utf8');
  process.stdout.write(`→ ${file} … `);
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    console.log('ÉCHEC');
    console.error(await res.text());
    process.exit(1);
  }
  console.log('ok');
}
console.log(`${files.length} migration(s) appliquée(s).`);
