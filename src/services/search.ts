import { listClients } from '@/services/clients';
import { listPosts } from '@/services/posts';
import { listIdeas } from '@/services/ideas';
import type { Client, Idea, Post } from '@/shared/types';

export interface SearchResults {
  clients: Client[];
  posts: Post[];
  ideas: Idea[];
}

const EMPTY: SearchResults = { clients: [], posts: [], ideas: [] };

/** Recherche transverse (agence) : clients, posts (search_tsv FR), idées. */
export async function globalSearch(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY;
  const needle = q.toLowerCase();

  const [clients, posts, ideas] = await Promise.all([
    listClients(true)
      .then((cs) =>
        cs
          .filter(
            (c) =>
              c.name.toLowerCase().includes(needle) ||
              (c.sector ?? '').toLowerCase().includes(needle),
          )
          .slice(0, 6),
      )
      .catch(() => []),
    listPosts({ q })
      .then((p) => p.slice(0, 8))
      .catch(() => []),
    listIdeas({ q })
      .then((i) => i.slice(0, 6))
      .catch(() => []),
  ]);

  return { clients, posts, ideas };
}
