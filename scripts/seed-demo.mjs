// Jeu de démo complet pour « Studio Lumen (démo) ».
// Recrée toutes les données enfant du client démo + quelques entités transverses
// (idées globales, templates globaux, marronniers globaux). Idempotent : purge puis recrée.
//
//   npm run seed:demo
//
// Comptes (mot de passe commun : PleinSoleil-2026!) :
//   alexis.heritier13@gmail.com     admin
//   lead.demo@studiolumen.test      lead
//   cm.demo@studiolumen.test        cm    (assigné au client démo)
//   client.demo@studiolumen.test    contact client

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.test.local' });
config({ path: '.env.local' });

const URL = process.env.SUPABASE_TEST_URL || process.env.VITE_SUPABASE_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const PW = 'PleinSoleil-2026!';
const CLIENT_ID = '4ec44294-efaf-423b-8d8d-91cc8724c3a2'; // Studio Lumen (démo)

if (!URL || !ANON || !SERVICE) {
  console.error('Variables Supabase manquantes (.env.test.local).');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
};
/** Upload un visuel d'exemple dans le bucket + crée la ligne post_media. */
async function uploadSampleMedia(postId, index) {
  let res;
  try {
    res = await fetch(`https://picsum.photos/seed/${postId}-${index}/1080/1080`, {
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return; // picsum injoignable : on continue sans visuel
  }
  if (!res.ok) return; // best-effort : pas de visuel si picsum indisponible
  const buf = Buffer.from(await res.arrayBuffer());
  const path = `${CLIENT_ID}/${postId}/${crypto.randomUUID()}.jpg`;
  const up = await admin.storage
    .from('post-media')
    .upload(path, buf, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw up.error;
  await admin.from('post_media').insert({
    post_id: postId,
    storage_path: path,
    kind: 'image',
    mime_type: 'image/jpeg',
    size_bytes: buf.length,
    width: 1080,
    height: 1080,
    position: index,
  });
}

async function ensureUser(email, role, fullName) {
  const list = await admin.auth.admin.listUsers({ perPage: 1000 });
  let u = list.data.users.find((x) => x.email === email);
  if (!u) {
    const c = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
    if (c.error) throw c.error;
    u = c.data.user;
  } else {
    await admin.auth.admin.updateUserById(u.id, { password: PW });
  }
  await admin.from('profiles').update({ role, is_active: true, full_name: fullName }).eq('id', u.id);
  return u.id;
}

async function actor(email) {
  const c = createClient(URL, ANON, {
    auth: { persistSession: false, storageKey: `seed-${crypto.randomUUID()}` },
  });
  const r = await c.auth.signInWithPassword({ email, password: PW });
  if (r.error) throw new Error(`signin ${email} : ${r.error.message}`);
  return c;
}

/** Insert avec vérification d'erreur explicite (les batchs RLS échouent en silence sinon). */
async function ins(client, table, rows, label) {
  const { error } = await client.from(table).insert(rows);
  if (error) throw new Error(`${label ?? table} : ${error.message}`);
}

async function main() {
  console.log('→ comptes');
  const adminId = await ensureUser('alexis.heritier13@gmail.com', 'admin', 'Alexis Heritier');
  const leadId = await ensureUser('lead.demo@studiolumen.test', 'lead', 'Léa Blanc');
  const cmId = await ensureUser('cm.demo@studiolumen.test', 'cm', 'Camille Roy');
  const contactId = await ensureUser('client.demo@studiolumen.test', 'client', 'Chris (Studio Lumen)');

  await admin
    .from('user_clients')
    .upsert([
      { profile_id: cmId, client_id: CLIENT_ID },
      { profile_id: leadId, client_id: CLIENT_ID },
    ]);
  await admin.from('client_contacts').upsert(
    {
      client_id: CLIENT_ID,
      email: 'client.demo@studiolumen.test',
      full_name: 'Chris (Studio Lumen)',
      auth_user_id: contactId,
      is_active: true,
    },
    { onConflict: 'client_id,email' },
  );

  const cm = await actor('cm.demo@studiolumen.test');
  const lead = await actor('lead.demo@studiolumen.test');
  const contact = await actor('client.demo@studiolumen.test');

  console.log('→ purge des données démo');
  // Visuels : vider le dossier du client dans le bucket (les lignes post_media
  // partent en cascade avec les posts juste après).
  try {
    const { data: postFolders } = await admin.storage.from('post-media').list(CLIENT_ID);
    for (const f of postFolders ?? []) {
      const { data: files } = await admin.storage
        .from('post-media')
        .list(`${CLIENT_ID}/${f.name}`);
      if (files?.length) {
        await admin.storage
          .from('post-media')
          .remove(files.map((x) => `${CLIENT_ID}/${f.name}/${x.name}`));
      }
    }
  } catch {
    /* bucket vide ou absent : rien à purger */
  }
  await admin.from('posts').delete().eq('client_id', CLIENT_ID);
  await admin.from('campaigns').delete().eq('client_id', CLIENT_ID);
  await admin.from('social_accounts').delete().eq('client_id', CLIENT_ID);
  await admin.from('client_requests').delete().eq('client_id', CLIENT_ID);
  await admin.from('ideas').delete().or(`client_id.eq.${CLIENT_ID},created_by.eq.${leadId}`);
  await admin.from('post_templates').delete().or(`client_id.eq.${CLIENT_ID},created_by.eq.${leadId}`);
  await admin.from('key_dates').delete().or(`client_id.eq.${CLIENT_ID},created_by.eq.${leadId}`);
  await admin.from('notifications').delete().eq('client_id', CLIENT_ID);

  console.log('→ fiche client');
  await admin
    .from('clients')
    .update({
      sector: 'décoration',
      logo_url: 'https://picsum.photos/seed/studiolumen-logo/120/120',
      is_archived: false,
    })
    .eq('id', CLIENT_ID);

  console.log('→ comptes sociaux');
  await admin.from('social_accounts').insert([
    { client_id: CLIENT_ID, network: 'instagram', handle: '@studiolumen.paris' },
    { client_id: CLIENT_ID, network: 'linkedin', handle: 'Studio Lumen' },
    { client_id: CLIENT_ID, network: 'tiktok', handle: '@studio.lumen' },
  ]);

  console.log('→ charte éditoriale');
  await admin.from('editorial_guidelines').upsert({
    client_id: CLIENT_ID,
    tone: 'Chaleureux, artisanal, précis. On tutoie la communauté. Phrases courtes.',
    words_to_avoid: 'cheap, pas cher, promo choc, révolutionnaire',
    words_to_prefer: 'savoir-faire, lin lavé, atelier, durable, made in France',
    good_examples:
      '« Le lin, on l’aime encore un peu froissé — c’est sa signature. »\n« Cousu à Roubaix, pensé pour durer. »',
    visual_guidelines:
      'Lumière naturelle, tons sable / écru / terracotta. Gros plans matière. Pas de filtre saturé.',
  });

  console.log('→ onboarding (partiel)');
  const ob = await admin
    .from('onboarding_items')
    .select('id')
    .eq('client_id', CLIENT_ID)
    .order('position');
  for (const row of (ob.data ?? []).slice(0, 4)) {
    await admin
      .from('onboarding_items')
      .update({ is_done: true, done_at: new Date().toISOString(), done_by: leadId })
      .eq('id', row.id);
  }

  console.log('→ campagnes + tags');
  const camp = await admin
    .from('campaigns')
    .insert([
      {
        client_id: CLIENT_ID,
        name: 'Collection Printemps 2026',
        starts_on: day(-30).slice(0, 10),
        ends_on: day(20).slice(0, 10),
        description: 'Lancement de la gamme lin lavé printemps.',
      },
      {
        client_id: CLIENT_ID,
        name: 'Été — pop-up store',
        starts_on: day(5).slice(0, 10),
        ends_on: day(45).slice(0, 10),
        description: 'Teasing puis ouverture du pop-up store éphémère.',
      },
    ])
    .select('id, name');
  const campPrintemps = camp.data.find((c) => c.name.startsWith('Collection')).id;
  const campEte = camp.data.find((c) => c.name.startsWith('Été')).id;

  const tagNames = ['produit', 'coulisses', 'printemps', 'été', 'UGC', 'tuto'];
  const tags = {};
  for (const name of tagNames) {
    const up = await admin.from('tags').upsert({ name }, { onConflict: 'name' }).select('id').single();
    tags[name] = up.data.id;
  }

  console.log('→ posts');
  const mkPost = async (p) => {
    const { data, error } = await admin
      .from('posts')
      .insert({
        client_id: CLIENT_ID,
        network: p.network,
        scheduled_at: p.at,
        caption: p.caption,
        status: p.status ?? 'draft',
        author_id: p.author ?? cmId,
        campaign_id: p.campaign ?? null,
        canva_url: p.canva ? 'https://www.canva.com/design/DEMO/view' : null,
        performance_note: p.perf ?? null,
        performance_visible_to_client: p.perfVisible ?? false,
      })
      .select('id')
      .single();
    if (error) throw error;
    if (p.tags) {
      await admin
        .from('post_tags')
        .insert(p.tags.map((t) => ({ post_id: data.id, tag_id: tags[t] })));
    }
    for (let i = 0; i < (p.media ?? 0); i++) await uploadSampleMedia(data.id, i);
    return data.id;
  };

  const P = {};
  P.pub1 = await mkPost({ network: 'instagram', at: day(-38), caption: 'La nouvelle collection lin lavé est là 🌾 Nuances sable, écru, terracotta.', status: 'published', campaign: campPrintemps, canva: true, media: 1, tags: ['produit', 'printemps'] });
  P.pub2 = await mkPost({ network: 'linkedin', at: day(-24), caption: 'Dans les coulisses de l’atelier : le tissage du lin, étape par étape.', status: 'published', author: leadId, canva: true, media: 1, tags: ['coulisses'] });
  P.pub3 = await mkPost({ network: 'instagram', at: day(-9), caption: 'Carrousel — 5 gestes pour garder son lin impeccable ✨', status: 'published', canva: true, media: 4, tags: ['tuto'], perf: '820 likes · 34 partages · +180 abonnés', perfVisible: true });
  P.sched1 = await mkPost({ network: 'instagram', at: day(4), caption: 'Teasing été ☀️ Quelque chose se prépare pour juin…', status: 'scheduled', campaign: campEte, canva: true, media: 1, tags: ['été'] });
  P.appr1 = await mkPost({ network: 'linkedin', at: day(7), caption: 'Collaboration avec un créateur textile local — interview à venir.', status: 'approved', author: leadId, canva: true });
  P.cr1 = await mkPost({ network: 'instagram', at: day(10), caption: 'Fête des mères : notre sélection de parures en lin lavé 💐', status: 'client_review', canva: true, media: 2, tags: ['produit'] });
  P.cr2 = await mkPost({ network: 'tiktok', at: day(13), caption: 'Reel — le process de teinture naturelle en 20 secondes.', status: 'client_review', author: leadId, canva: true });
  P.ir1 = await mkPost({ network: 'instagram', at: day(6), caption: 'On ouvre un pop-up store éphémère ! Rendez-vous rue de Turenne.', status: 'internal_review', campaign: campEte, canva: true, media: 1 });
  P.ir2 = await mkPost({ network: 'linkedin', at: day(16), caption: 'Portrait — rencontre avec Camille, responsable de production.', status: 'internal_review' });
  P.draft1 = await mkPost({ network: 'instagram', at: day(21), caption: 'Idée : reposter les photos de nos clientes (UGC) avec leur accord.', tags: ['UGC'] });
  P.trash1 = await mkPost({ network: 'instagram', at: day(28), caption: 'Brouillon soldes — à ne pas publier finalement.' });

  console.log('→ pipeline (historique + notifications réels)');
  // un brouillon qui remonte tout le circuit
  const pFlow = await mkPost({ network: 'instagram', at: day(9), caption: 'Nouveau coloris : terracotta brûlée 🔥 disponible en parure et rideaux.', canva: 'pflow', tags: ['produit'] });
  await cm.rpc('post_change_status', { p_post_id: pFlow, p_to: 'internal_review' });
  await lead.rpc('post_change_status', { p_post_id: pFlow, p_to: 'client_review' });
  await contact.rpc('approve_post', { p_post_id: pFlow });

  // un post renvoyé au rédacteur par le lead
  const pReturn = await mkPost({ network: 'linkedin', at: day(18), caption: 'Brouillon un peu court sur le savoir-faire.', canva: 'pret' });
  await cm.rpc('post_change_status', { p_post_id: pReturn, p_to: 'internal_review' });
  await lead.rpc('post_change_status', {
    p_post_id: pReturn,
    p_to: 'draft',
    p_comment: 'Développer l’angle « artisanat » et ajouter une anecdote d’atelier.',
  });

  // un post refusé par le client
  const pReject = await mkPost({ network: 'instagram', at: day(11), caption: 'Visuel promo — code SOLDES30.', canva: 'prej' });
  await cm.rpc('post_change_status', { p_post_id: pReject, p_to: 'internal_review' });
  await lead.rpc('post_change_status', { p_post_id: pReject, p_to: 'client_review' });
  await contact.rpc('reject_post', {
    p_post_id: pReject,
    p_comment: 'On évite le mot « promo » et les codes chocs, pas raccord avec la marque.',
  });

  // conditions déclenchant des alertes (Epic 8)
  await admin
    .from('posts')
    .update({ status_changed_at: day(-6) })
    .in('id', [P.ir1, P.cr2]); // en attente de validation depuis 6 j (règle a)
  const pToday = new Date();
  pToday.setHours(9, 30, 0, 0);
  await mkPost({ network: 'instagram', at: pToday.toISOString(), caption: 'Post du jour — citation inspirante à publier ce matin.', status: 'scheduled', canva: 'ptoday' });
  await mkPost({ network: 'linkedin', at: day(2), caption: 'Brouillon urgent : deadline dans 2 jours et pas encore de visuel.' }); // règles b + d

  console.log('→ commentaires');
  await cm.from('post_comments').insert([
    { post_id: P.cr1, author_id: cmId, body: 'Visuel validé en interne, on attend le retour de la cliente.', visibility: 'internal' },
    { post_id: P.cr1, author_id: cmId, body: 'Bonjour Chris, ce post vous convient-il pour la fête des mères ?', visibility: 'client' },
  ]);
  await contact.from('post_comments').insert([
    { post_id: P.cr1, author_id: contactId, body: 'Oui ! Peut-on juste ajouter le lien vers la page parures ?', visibility: 'client' },
    { post_id: P.pub3, author_id: contactId, body: 'Excellents retours sur ce carrousel, merci 🙏', visibility: 'client' },
  ]);

  console.log('→ relance client');
  await cm.rpc('remind_client_review', { p_post_id: P.cr2 });

  console.log('→ corbeille');
  await lead.rpc('post_trash', { p_post_id: P.trash1 });

  console.log('→ demandes client (briefs)');
  const req1 = await contact
    .from('client_requests')
    .insert({
      client_id: CLIENT_ID,
      created_by: contactId,
      title: 'Post pour la fête des pères',
      description: 'Mettre en avant les peignoirs et serviettes en nid d’abeille.',
      wanted_network: 'instagram',
      wanted_date: day(25).slice(0, 10),
    })
    .select('id')
    .single();
  const req2 = await contact
    .from('client_requests')
    .insert({
      client_id: CLIENT_ID,
      created_by: contactId,
      title: 'Story Q&A sur l’entretien du lin',
      description: 'Répondre aux questions fréquentes (lavage, repassage, taches).',
    })
    .select('id')
    .single();
  const req3 = await contact
    .from('client_requests')
    .insert({
      client_id: CLIENT_ID,
      created_by: contactId,
      title: 'Annoncer le nouveau coloris terracotta',
      description: 'Déjà en boutique, à pousser sur les réseaux.',
      wanted_network: 'instagram',
    })
    .select('id')
    .single();

  await cm.from('client_request_comments').insert([
    { request_id: req1.data.id, author_id: cmId, body: 'Bien reçu, on cale ça dans le planning de juin.' },
    { request_id: req2.data.id, author_id: cmId, body: 'On prépare une story en 5 questions, retour d’ici vendredi.' },
  ]);
  await lead.from('client_requests').update({ status: 'prise_en_compte' }).eq('id', req2.data.id);
  // req3 → transformée en post
  await cm.rpc('request_to_post', { p_request_id: req3.data.id, p_network: 'instagram' });

  console.log('→ idées');
  const mkIdea = async (title, description, clientId, tagList) => {
    const owner = clientId ? cm : lead;
    const ownerId = clientId ? cmId : leadId;
    const { data } = await owner
      .from('ideas')
      .insert({ title, description, client_id: clientId, created_by: ownerId })
      .select('id')
      .single();
    for (const t of tagList ?? []) {
      const up = await admin.from('tags').upsert({ name: t }, { onConflict: 'name' }).select('id').single();
      await owner.from('idea_tags').insert({ idea_id: data.id, tag_id: up.data.id });
    }
    return data.id;
  };
  await mkIdea('Série « Le geste juste » — tutos courts', 'Format récurrent : 1 geste d’entretien / semaine.', null, ['tuto']);
  await mkIdea('Calendrier de l’avent produits', 'Décembre : 1 pièce mise en avant par jour.', null, null);
  await mkIdea('Interview de la fondatrice sur le made in France', 'Format long LinkedIn + extraits Reels.', CLIENT_ID, ['coulisses']);
  const ideaAvantApres = await mkIdea(
    'Avant / après : une chambre relookée en lin',
    'Collab avec une cliente, photos avant/après.',
    CLIENT_ID,
    ['UGC'],
  );
  await cm.rpc('idea_to_post', { p_idea_id: ideaAvantApres, p_client_id: CLIENT_ID, p_network: 'instagram' });

  console.log('→ templates');
  await ins(lead, 'post_templates', [
    {
      name: 'Citation inspirante — lundi',
      description: 'Format récurrent du lundi.',
      network: 'instagram',
      caption_template: '✨ Citation de la semaine\n\n« … »\n\n#MondayMotivation',
      default_tags: ['citation'],
      client_id: null,
      created_by: leadId,
    },
    {
      name: 'Annonce produit',
      description: 'Lancement / réassort.',
      network: null,
      caption_template: '🆕 Nouveau chez {marque} !\n\n[Produit] — [bénéfice clé]\n\n👉 [CTA]',
      default_tags: ['produit'],
      client_id: null,
      created_by: leadId,
    },
  ]);
  await cm.from('post_templates').insert({
    name: 'Coulisses atelier',
    description: 'Storytelling savoir-faire (Studio Lumen).',
    network: 'linkedin',
    caption_template:
      'Dans les coulisses de l’atelier Studio Lumen 🧵\n\n[Anecdote / savoir-faire]\n\n#artisanat #madeinfrance',
    default_tags: ['coulisses'],
    client_id: CLIENT_ID,
    created_by: cmId,
  });

  console.log('→ marronniers');
  await ins(lead, 'key_dates', [
    { name: 'Saint-Valentin', event_date: '2026-02-14', recurring_annually: true, scope: 'global', created_by: leadId, description: 'Idées cadeaux, ambiance cocooning.' },
    { name: 'Fête des mères (FR)', event_date: '2026-05-31', recurring_annually: true, scope: 'global', created_by: leadId, description: '' },
    { name: 'Black Friday', event_date: '2026-11-27', recurring_annually: true, scope: 'global', created_by: leadId, description: 'Positionnement responsable plutôt que discount.' },
    { name: 'Paris Design Week', event_date: '2026-09-07', recurring_annually: true, scope: 'sector', sector: 'décoration', created_by: leadId, description: 'Studio Lumen est dans le secteur « décoration ».' },
  ]);
  const kdAnniv = await cm
    .from('key_dates')
    .insert({
      name: 'Anniversaire Studio Lumen',
      event_date: '2026-06-15',
      recurring_annually: true,
      scope: 'client',
      client_id: CLIENT_ID,
      created_by: cmId,
      description: 'Offre spéciale abonnés + remerciement communauté.',
    })
    .select('id')
    .single();
  await cm.rpc('key_date_to_post', {
    p_key_date_id: kdAnniv.data.id,
    p_client_id: CLIENT_ID,
    p_year: new Date().getFullYear() + 1,
    p_network: 'instagram',
  });

  console.log('→ génération des alertes');
  await admin.from('alerts').delete().eq('client_id', CLIENT_ID);
  const alertsRun = await admin.rpc('generate_alerts');

  const counts = await admin.from('posts').select('status').eq('client_id', CLIENT_ID);
  const byStatus = {};
  for (const p of counts.data ?? []) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  const al = await admin.from('alerts').select('type').eq('client_id', CLIENT_ID);
  console.log('\n✓ jeu de démo prêt.');
  console.log('  posts par statut :', byStatus);
  console.log('  alertes :', (al.data ?? []).map((a) => a.type));
  console.log('  connexion : voir en-tête du script (mdp : ' + PW + ')');
  void alertsRun;
}

main().catch((e) => {
  console.error('\n✗ échec :', e.message ?? e);
  process.exit(1);
});
