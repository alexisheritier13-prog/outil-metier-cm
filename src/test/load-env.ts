// setupFile n°1 : charge les .env dans process.env avant tout le reste.
// (Vitest n'expose que les variables VITE_* ; les tests d'intégration lisent
//  SUPABASE_TEST_* depuis process.env.)
import { config } from 'dotenv';

config({ path: '.env.test.local' });
config({ path: '.env.local' });
