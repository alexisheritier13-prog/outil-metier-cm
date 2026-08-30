import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, deleteTestUsers, hasDbTestEnv, tableExists } from './_helpers';
import { getSupabase } from '@/lib/supabase';
import { AccountDisabledError, signIn } from '@/services/auth';

const ready = hasDbTestEnv && (await tableExists('profiles'));
const maybe = ready ? describe : describe.skip;

const PASSWORD = 'Test-Passw0rd!';

/** Vérifie le service `signIn` contre le vrai backend (Story 1.4, AC 1 & 2). */
maybe('signIn (intégration)', () => {
  const created: string[] = [];

  async function makeUser(isActive: boolean): Promise<string> {
    const email = `test+auth-${crypto.randomUUID()}@example.test`;
    const a = admin();
    const { data, error } = await a.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message);
    created.push(data.user.id);
    await a.from('profiles').update({ role: 'cm', is_active: isActive }).eq('id', data.user.id);
    return email;
  }

  beforeAll(async () => {
    // isol64: s'assurer qu'aucune session ne traîne
    await getSupabase().auth.signOut();
  });

  afterAll(async () => {
    await getSupabase().auth.signOut();
    await deleteTestUsers(created);
  }, 20_000);

  it('connecte un compte actif et renvoie son profil', async () => {
    const email = await makeUser(true);
    const profile = await signIn(email, PASSWORD);
    expect(profile.email).toBe(email);
    expect(profile.role).toBe('cm');
    expect(profile.isActive).toBe(true);
    await getSupabase().auth.signOut();
  });

  it('refuse un compte désactivé et coupe la session', async () => {
    const email = await makeUser(false);
    await expect(signIn(email, PASSWORD)).rejects.toBeInstanceOf(AccountDisabledError);
    const { data } = await getSupabase().auth.getSession();
    expect(data.session).toBeNull();
  });

  it('refuse un mot de passe incorrect', async () => {
    const email = await makeUser(true);
    await expect(signIn(email, 'mauvais')).rejects.toThrow(/incorrect/i);
    await getSupabase().auth.signOut();
  });
});
