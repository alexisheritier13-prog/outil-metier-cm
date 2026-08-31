import type { Database } from '@/shared/types/database';
import type { Role } from '@/shared/constants/roles';
import type { PostStatus } from '@/shared/constants/postStatus';

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
type EditorialGuidelineRow = Database['public']['Tables']['editorial_guidelines']['Row'];
type OnboardingItemRow = Database['public']['Tables']['onboarding_items']['Row'];
type ClientOverviewRow = Database['public']['Views']['client_overview']['Row'];
type PostRow = Database['public']['Tables']['posts']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];
type CampaignRow = Database['public']['Tables']['campaigns']['Row'];
type CampaignOverviewRow = Database['public']['Views']['campaign_overview']['Row'];

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

export interface EditorialGuideline {
  clientId: string;
  tone: string;
  wordsToAvoid: string;
  wordsToPrefer: string;
  goodExamples: string;
  visualGuidelines: string;
  updatedAt: string;
}

export function toEditorialGuideline(row: EditorialGuidelineRow): EditorialGuideline {
  return {
    clientId: row.client_id,
    tone: row.tone,
    wordsToAvoid: row.words_to_avoid,
    wordsToPrefer: row.words_to_prefer,
    goodExamples: row.good_examples,
    visualGuidelines: row.visual_guidelines,
    updatedAt: row.updated_at,
  };
}

export const EMPTY_GUIDELINE = (clientId: string): EditorialGuideline => ({
  clientId,
  tone: '',
  wordsToAvoid: '',
  wordsToPrefer: '',
  goodExamples: '',
  visualGuidelines: '',
  updatedAt: '',
});

export interface OnboardingItem {
  id: string;
  clientId: string;
  label: string;
  position: number;
  isDone: boolean;
  doneAt: string | null;
  doneBy: string | null;
}

export function toOnboardingItem(row: OnboardingItemRow): OnboardingItem {
  return {
    id: row.id,
    clientId: row.client_id,
    label: row.label,
    position: row.position,
    isDone: row.is_done,
    doneAt: row.done_at,
    doneBy: row.done_by,
  };
}

export interface ClientOverview {
  id: string;
  name: string;
  logoUrl: string | null;
  sector: string | null;
  isArchived: boolean;
  onboardingDone: number;
  onboardingTotal: number;
  pendingInternal: number;
  pendingClient: number;
  lastActivityAt: string | null;
}

export function toClientOverview(row: ClientOverviewRow): ClientOverview {
  return {
    id: row.id ?? '',
    name: row.name ?? '',
    logoUrl: row.logo_url,
    sector: row.sector,
    isArchived: row.is_archived ?? false,
    onboardingDone: row.onboarding_done ?? 0,
    onboardingTotal: row.onboarding_total ?? 0,
    pendingInternal: row.pending_internal ?? 0,
    pendingClient: row.pending_client ?? 0,
    lastActivityAt: row.last_activity_at,
  };
}

export interface Post {
  id: string;
  clientId: string;
  network: Network;
  scheduledAt: string; // ISO UTC
  caption: string;
  canvaUrl: string | null;
  canvaThumbnailUrl: string | null;
  canvaThumbnailSource: 'auto' | 'manual' | null;
  canvaFetchedAt: string | null;
  status: PostStatus;
  authorId: string;
  campaignId: string | null;
  performanceNote: string | null;
  performanceVisibleToClient: boolean;
  statusChangedAt: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toPost(row: PostRow): Post {
  return {
    id: row.id,
    clientId: row.client_id,
    network: row.network,
    scheduledAt: row.scheduled_at,
    caption: row.caption,
    canvaUrl: row.canva_url,
    canvaThumbnailUrl: row.canva_thumbnail_url,
    canvaThumbnailSource: (row.canva_thumbnail_source as 'auto' | 'manual' | null) ?? null,
    canvaFetchedAt: row.canva_fetched_at,
    status: row.status,
    authorId: row.author_id,
    campaignId: row.campaign_id,
    performanceNote: row.performance_note,
    performanceVisibleToClient: row.performance_visible_to_client,
    statusChangedAt: row.status_changed_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}
export function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, color: row.color };
}

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  description: string;
  postCount?: number;
}
export function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    description: row.description,
  };
}
export function toCampaignOverview(row: CampaignOverviewRow): Campaign {
  return {
    id: row.id ?? '',
    clientId: row.client_id ?? '',
    name: row.name ?? '',
    startsOn: row.starts_on ?? '',
    endsOn: row.ends_on ?? '',
    description: row.description ?? '',
    postCount: row.post_count ?? 0,
  };
}

type PostHistoryRow = Database['public']['Tables']['post_history']['Row'];
type PostCommentRow = Database['public']['Tables']['post_comments']['Row'];
type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type ClientActivityRow = Database['public']['Views']['client_activity']['Row'];

export interface PostHistoryEntry {
  id: number;
  actorId: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}
export function toPostHistoryEntry(row: PostHistoryRow): PostHistoryEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: row.created_at,
  };
}

export type CommentVisibility = 'internal' | 'client';
export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  visibility: CommentVisibility;
  createdAt: string;
  updatedAt: string;
}
export function toPostComment(row: PostCommentRow): PostComment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NotificationType =
  | 'post_submitted'
  | 'post_internal_approved'
  | 'post_returned'
  | 'post_client_approved'
  | 'post_client_rejected'
  | (string & {});

export interface AppNotification {
  id: string;
  type: NotificationType;
  postId: string | null;
  clientId: string | null;
  actorId: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
}
export function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    postId: row.post_id,
    clientId: row.client_id,
    actorId: row.actor_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export interface ClientActivityEntry {
  historyId: number;
  clientId: string;
  postId: string;
  postCaption: string;
  network: Network;
  scheduledAt: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}
export function toClientActivityEntry(row: ClientActivityRow): ClientActivityEntry {
  return {
    historyId: row.history_id ?? 0,
    clientId: row.client_id ?? '',
    postId: row.post_id ?? '',
    postCaption: row.post_caption ?? '',
    network: row.network as Network,
    scheduledAt: row.scheduled_at ?? '',
    action: row.action ?? '',
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    actorId: row.actor_id,
    actorName: row.actor_name,
    createdAt: row.created_at ?? '',
  };
}
