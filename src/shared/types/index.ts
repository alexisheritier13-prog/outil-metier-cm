import type { Database } from '@/shared/types/database';
import type { Role } from '@/shared/constants/roles';

export type { Database } from '@/shared/types/database';
export type { Role } from '@/shared/constants/roles';
export type { Network } from '@/shared/constants/networks';
export type { PostStatus } from '@/shared/constants/postStatus';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ClientRow = Database['public']['Tables']['clients']['Row'];

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface Client {
  id: string;
  name: string;
  logoUrl: string | null;
  sector: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    sector: row.sector,
    isArchived: row.is_archived,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
