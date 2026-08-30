#!/usr/bin/env node
/**
 * Régénère src/shared/types/database.ts depuis le schéma du projet Supabase lié,
 * via l'API Management (pas de CLI supabase sur le PATH nécessaire).
 *
 * Env requis (chargés depuis .env.test.local / .env.local) :
 *   SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
 */
import { readFileSync, writeFileSync } from 'node:fs';

for (const file of ['.env.test.local', '.env.local']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* ignore */
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error('SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF sont requis.');
  process.exit(1);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/types/typescript?included_schemas=public`,
  { headers: { Authorization: `Bearer ${token}` } },
);
if (!res.ok) {
  console.error(`Échec (${res.status}) :`, await res.text());
  process.exit(1);
}
const { types } = await res.json();
writeFileSync('src/shared/types/database.ts', types, 'utf8');
console.log('src/shared/types/database.ts régénéré.');
