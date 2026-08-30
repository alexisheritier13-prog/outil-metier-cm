import type { Database } from '@/shared/types/database';
import type { Role } from '@/shared/constants/roles';

export type { Database } from '@/shared/types/database';
export type { Role } from '@/shared/constants/roles';
export type { Network } from '@/shared/constants/networks';
export type { PostStatus } from '@/shared/constants/postStatus';

import type { Network } from '@/shared/constants/networks';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ClientRow = Database['public']['Tables']['clients']['Row'];
type SocialAccountRow = Database['public']['Tables']['social_accounts']['Row'];
type NetworkRow = Database['public']['Tables']['networks']['Row'];
type ClientContactRow = Database['public']['Tables']['client_contacts']['Row'];

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

export interface SocialAccount {
  id: string;
  clientId: string;
  network: Network;
  handle: string;
  createdAt: string;
}

export function toSocialAccount(row: SocialAccountRow): SocialAccount {
  return {
    id: row.id,
    clientId: row.client_id,
    network: row.network,
    handle: row.handle,
    createdAt: row.created_at,
  };
}

export interface NetworkRef {
  code: Network;
  label: string;
  specs: string;
  position: number;
}

export function toNetworkRef(row: NetworkRow): NetworkRef {
  return { code: row.code, label: row.label, specs: row.specs, position: row.position };
}

export interface ClientContact {
  id: string;
  clientId: string;
  fullName: string;
  email: string;
  authUserId: string | null;
  isActive: boolean;
  createdAt: string;
}

export function toClientContact(row: ClientContactRow): ClientContact {
  return {
    id: row.id,
    clientId: row.client_id,
    fullName: row.full_name,
    email: row.email,
    authUserId: row.auth_user_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
