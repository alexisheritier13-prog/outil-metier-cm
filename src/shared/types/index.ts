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
type PostMediaRow = Database['public']['Tables']['post_media']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];
type CampaignRow = Database['public']['Tables']['campaigns']['Row'];
type CampaignOverviewRow = Database['public']['Views']['campaign_overview']['Row'];

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatarUrl?: string | null;
  /** Organisation (locataire) de l'utilisateur. `null` tant qu'il n'a pas rejoint d'agence. */
  organizationId?: string | null;
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
    avatarUrl: row.avatar_url,
    organizationId: row.organization_id ?? null,
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
  /** Ce client ne valide pas les posts : l'étape « à valider client » est sautée. */
  skipClientReview?: boolean;
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
    skipClientReview: row.skip_client_review,
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

export interface BrandColor {
  hex: string;
  label: string;
}

export interface EditorialGuideline {
  clientId: string;
  tone: string;
  wordsToAvoid: string;
  wordsToPrefer: string;
  goodExamples: string;
  visualGuidelines: string;
  brandColors: BrandColor[];
  typography: string;
  updatedAt: string;
}

function toBrandColors(value: unknown): BrandColor[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
    .map((c) => ({
      hex: typeof c.hex === 'string' ? c.hex : '',
      label: typeof c.label === 'string' ? c.label : '',
    }));
}

export function toEditorialGuideline(row: EditorialGuidelineRow): EditorialGuideline {
  return {
    clientId: row.client_id,
    tone: row.tone,
    wordsToAvoid: row.words_to_avoid,
    wordsToPrefer: row.words_to_prefer,
    goodExamples: row.good_examples,
    visualGuidelines: row.visual_guidelines,
    brandColors: toBrandColors(row.brand_colors),
    typography: row.typography,
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
  brandColors: [],
  typography: '',
  updatedAt: '',
});

type ClientContractRow = Database['public']['Tables']['client_contracts']['Row'];
type ClientCredentialRow = Database['public']['Tables']['client_credentials']['Row'];

export interface ClientContract {
  clientId: string;
  scope: string;
  cadence: string;
  channels: string;
  startDate: string | null;
  notes: string;
  updatedAt: string;
}

export function toClientContract(row: ClientContractRow): ClientContract {
  return {
    clientId: row.client_id,
    scope: row.scope,
    cadence: row.cadence,
    channels: row.channels,
    startDate: row.start_date,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export const EMPTY_CONTRACT = (clientId: string): ClientContract => ({
  clientId,
  scope: '',
  cadence: '',
  channels: '',
  startDate: null,
  notes: '',
  updatedAt: '',
});

export interface ClientCredential {
  id: string;
  clientId: string;
  label: string;
  login: string;
  secret: string;
  url: string;
  notes: string;
  sortOrder: number;
  updatedAt: string;
}

export function toClientCredential(row: ClientCredentialRow): ClientCredential {
  return {
    id: row.id,
    clientId: row.client_id,
    label: row.label,
    login: row.login,
    secret: row.secret,
    url: row.url,
    notes: row.notes,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

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
  /** Lien de travail Canva — interne, jamais exposé au contact client. */
  canvaUrl: string | null;
  status: PostStatus;
  authorId: string;
  campaignId: string | null;
  pillarId: string | null;
  originType: PostOriginType | null;
  originId: string | null;
  performanceNote: string | null;
  performanceVisibleToClient: boolean;
  statusChangedAt: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PostOriginType = 'idea' | 'key_date' | 'client_request' | 'duplicate';

type ClientPillarRow = Database['public']['Tables']['client_pillars']['Row'];

export interface ClientPillar {
  id: string;
  clientId: string;
  label: string;
  targetPct: number;
  sortOrder: number;
}

export function toClientPillar(row: ClientPillarRow): ClientPillar {
  return {
    id: row.id,
    clientId: row.client_id,
    label: row.label,
    targetPct: row.target_pct,
    sortOrder: row.sort_order,
  };
}

export type PostMediaKind = 'image' | 'video';

export interface PostMedia {
  id: string;
  postId: string;
  storagePath: string;
  kind: PostMediaKind;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  position: number;
  createdAt: string;
}

export function toPostMedia(row: PostMediaRow): PostMedia {
  return {
    id: row.id,
    postId: row.post_id,
    storagePath: row.storage_path,
    kind: row.kind as PostMediaKind,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    width: row.width,
    height: row.height,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    position: row.position,
    createdAt: row.created_at,
  };
}

export function toPost(row: PostRow): Post {
  return {
    id: row.id,
    clientId: row.client_id,
    network: row.network,
    scheduledAt: row.scheduled_at,
    caption: row.caption,
    canvaUrl: row.canva_url,
    status: row.status,
    authorId: row.author_id,
    campaignId: row.campaign_id,
    pillarId: row.pillar_id,
    originType: (row.origin_type as Post['originType']) ?? null,
    originId: row.origin_id,
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
type ClientRequestRow = Database['public']['Tables']['client_requests']['Row'];
type ClientRequestCommentRow = Database['public']['Tables']['client_request_comments']['Row'];
type IdeaRow = Database['public']['Tables']['ideas']['Row'];
type PostTemplateRow = Database['public']['Tables']['post_templates']['Row'];
type KeyDateRow = Database['public']['Tables']['key_dates']['Row'];
type AlertRow = Database['public']['Tables']['alerts']['Row'];

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
  | 'post_awaiting_client'
  | 'comment_client'
  | 'comment_agency'
  | 'comment_internal'
  | 'job_failed'
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

export type ClientRequestStatus = 'nouvelle' | 'prise_en_compte' | 'traitee';

export const CLIENT_REQUEST_STATUS_LABELS: Record<ClientRequestStatus, string> = {
  nouvelle: 'Nouvelle',
  prise_en_compte: 'Prise en compte',
  traitee: 'Traitée',
};

export interface ClientRequest {
  id: string;
  clientId: string;
  createdBy: string;
  title: string;
  description: string;
  wantedNetwork: Network | null;
  wantedDate: string | null;
  status: ClientRequestStatus;
  createdAt: string;
  updatedAt: string;
}
export function toClientRequest(row: ClientRequestRow): ClientRequest {
  return {
    id: row.id,
    clientId: row.client_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    wantedNetwork: row.wanted_network,
    wantedDate: row.wanted_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ClientRequestComment {
  id: string;
  requestId: string;
  authorId: string;
  body: string;
  createdAt: string;
}
export function toClientRequestComment(row: ClientRequestCommentRow): ClientRequestComment {
  return {
    id: row.id,
    requestId: row.request_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  clientId: string | null;
  originRequestId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
export function toIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    clientId: row.client_id,
    originRequestId: row.origin_request_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface PostTemplate {
  id: string;
  name: string;
  description: string;
  network: Network | null;
  captionTemplate: string;
  defaultTags: string[];
  clientId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
export function toPostTemplate(row: PostTemplateRow): PostTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    network: row.network,
    captionTemplate: row.caption_template,
    defaultTags: row.default_tags ?? [],
    clientId: row.client_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type KeyDateScope = 'global' | 'sector' | 'client';

export interface KeyDate {
  id: string;
  name: string;
  eventDate: string;
  recurringAnnually: boolean;
  scope: KeyDateScope;
  sector: string | null;
  clientId: string | null;
  description: string;
  /** `null` = marronnier fourni par le système (seed). */
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
export function toKeyDate(row: KeyDateRow): KeyDate {
  return {
    id: row.id,
    name: row.name,
    eventDate: row.event_date,
    recurringAnnually: row.recurring_annually,
    scope: row.scope,
    sector: row.sector,
    clientId: row.client_id,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type AlertType =
  | 'validation_overdue'
  | 'deadline_unvalidated'
  | 'calendar_gap'
  | 'missing_canva'
  | 'keydate_unplanned'
  | 'client_inactive'
  | 'publish_reminder';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'new' | 'seen' | 'dismissed';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  validation_overdue: 'Validation en retard',
  deadline_unvalidated: 'Deadline / non validé',
  calendar_gap: 'Trou de calendrier',
  missing_canva: 'Visuel manquant',
  keydate_unplanned: 'Marronnier non planifié',
  client_inactive: 'Client inactif',
  publish_reminder: 'À publier aujourd’hui',
};

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  clientId: string | null;
  postId: string | null;
  targetRole: Role | null;
  targetUserId: string | null;
  message: string;
  status: AlertStatus;
  createdAt: string;
}
export function toAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity as AlertSeverity,
    clientId: row.client_id,
    postId: row.post_id,
    targetRole: row.target_role,
    targetUserId: row.target_user_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}
