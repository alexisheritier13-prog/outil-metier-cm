export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_meta: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          client_id: string
          created_at: string
          description: string
          ends_on: string
          id: string
          name: string
          starts_on: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string
          ends_on: string
          id?: string
          name: string
          starts_on: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          ends_on?: string
          id?: string
          name?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          auth_user_id: string | null
          client_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          auth_user_id?: string | null
          client_id: string
          created_at?: string
          email: string
          full_name?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          auth_user_id?: string | null
          client_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_archived: boolean
          logo_url: string | null
          name: string
          sector: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_archived?: boolean
          logo_url?: string | null
          name: string
          sector?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_archived?: boolean
          logo_url?: string | null
          name?: string
          sector?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_guidelines: {
        Row: {
          client_id: string
          good_examples: string
          tone: string
          updated_at: string
          updated_by: string | null
          visual_guidelines: string
          words_to_avoid: string
          words_to_prefer: string
        }
        Insert: {
          client_id: string
          good_examples?: string
          tone?: string
          updated_at?: string
          updated_by?: string | null
          visual_guidelines?: string
          words_to_avoid?: string
          words_to_prefer?: string
        }
        Update: {
          client_id?: string
          good_examples?: string
          tone?: string
          updated_at?: string
          updated_by?: string | null
          visual_guidelines?: string
          words_to_avoid?: string
          words_to_prefer?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_guidelines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_guidelines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_guidelines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: number
          job_name: string
          ok: boolean | null
          started_at: string
          stats: Json
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: never
          job_name: string
          ok?: boolean | null
          started_at?: string
          stats?: Json
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: never
          job_name?: string
          ok?: boolean | null
          started_at?: string
          stats?: Json
        }
        Relationships: []
      }
      networks: {
        Row: {
          code: Database["public"]["Enums"]["network_t"]
          label: string
          position: number
          specs: string
        }
        Insert: {
          code: Database["public"]["Enums"]["network_t"]
          label: string
          position?: number
          specs?: string
        }
        Update: {
          code?: Database["public"]["Enums"]["network_t"]
          label?: string
          position?: number
          specs?: string
        }
        Relationships: []
      }
      onboarding_items: {
        Row: {
          client_id: string
          created_at: string
          done_at: string | null
          done_by: string | null
          id: string
          is_done: boolean
          label: string
          position: number
        }
        Insert: {
          client_id: string
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          label: string
          position?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_items_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
          updated_at: string
          visibility: Database["public"]["Enums"]["comment_visibility_t"]
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["comment_visibility_t"]
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["comment_visibility_t"]
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_history: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          field: string | null
          id: number
          new_value: string | null
          old_value: string | null
          post_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          field?: string | null
          id?: never
          new_value?: string | null
          old_value?: string | null
          post_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          field?: string | null
          id?: never
          new_value?: string | null
          old_value?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      post_transitions: {
        Row: {
          from_status: Database["public"]["Enums"]["post_status_t"]
          needs_client_contact: boolean
          needs_comment: boolean
          roles: Database["public"]["Enums"]["role_t"][]
          to_status: Database["public"]["Enums"]["post_status_t"]
        }
        Insert: {
          from_status: Database["public"]["Enums"]["post_status_t"]
          needs_client_contact?: boolean
          needs_comment?: boolean
          roles: Database["public"]["Enums"]["role_t"][]
          to_status: Database["public"]["Enums"]["post_status_t"]
        }
        Update: {
          from_status?: Database["public"]["Enums"]["post_status_t"]
          needs_client_contact?: boolean
          needs_comment?: boolean
          roles?: Database["public"]["Enums"]["role_t"][]
          to_status?: Database["public"]["Enums"]["post_status_t"]
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          campaign_id: string | null
          canva_fetched_at: string | null
          canva_thumbnail_source: string | null
          canva_thumbnail_url: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          scheduled_at: string
          search_tsv: unknown
          status: Database["public"]["Enums"]["post_status_t"]
          status_changed_at: string
          status_changed_by: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          campaign_id?: string | null
          canva_fetched_at?: string | null
          canva_thumbnail_source?: string | null
          canva_thumbnail_url?: string | null
          canva_url?: string | null
          caption?: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          network: Database["public"]["Enums"]["network_t"]
          origin_id?: string | null
          origin_type?: string | null
          performance_note?: string | null
          performance_visible_to_client?: boolean
          scheduled_at: string
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["post_status_t"]
          status_changed_at?: string
          status_changed_by?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          campaign_id?: string | null
          canva_fetched_at?: string | null
          canva_thumbnail_source?: string | null
          canva_thumbnail_url?: string | null
          canva_url?: string | null
          caption?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          network?: Database["public"]["Enums"]["network_t"]
          origin_id?: string | null
          origin_type?: string | null
          performance_note?: string | null
          performance_visible_to_client?: boolean
          scheduled_at?: string
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["post_status_t"]
          status_changed_at?: string
          status_changed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["role_t"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["role_t"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["role_t"]
          updated_at?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          client_id: string
          created_at: string
          handle: string
          id: string
          network: Database["public"]["Enums"]["network_t"]
        }
        Insert: {
          client_id: string
          created_at?: string
          handle: string
          id?: string
          network: Database["public"]["Enums"]["network_t"]
        }
        Update: {
          client_id?: string
          created_at?: string
          handle?: string
          id?: string
          network?: Database["public"]["Enums"]["network_t"]
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_clients: {
        Row: {
          client_id: string
          profile_id: string
        }
        Insert: {
          client_id: string
          profile_id: string
        }
        Update: {
          client_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      campaign_overview: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          ends_on: string | null
          id: string | null
          name: string | null
          post_count: number | null
          starts_on: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          ends_on?: string | null
          id?: string | null
          name?: string | null
          post_count?: never
          starts_on?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          ends_on?: string | null
          id?: string | null
          name?: string | null
          post_count?: never
          starts_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_onboarding_progress: {
        Row: {
          client_id: string | null
          done: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_overview: {
        Row: {
          created_at: string | null
          id: string | null
          is_archived: boolean | null
          last_activity_at: string | null
          logo_url: string | null
          name: string | null
          onboarding_done: number | null
          onboarding_total: number | null
          pending_client: number | null
          pending_internal: number | null
          sector: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_is_active: { Args: never; Returns: boolean }
      auth_role: { Args: never; Returns: Database["public"]["Enums"]["role_t"] }
      can_transition: {
        Args: {
          p_from: Database["public"]["Enums"]["post_status_t"]
          p_role: Database["public"]["Enums"]["role_t"]
          p_to: Database["public"]["Enums"]["post_status_t"]
        }
        Returns: boolean
      }
      client_restore: { Args: { p_client_id: string }; Returns: undefined }
      client_trash: { Args: { p_client_id: string }; Returns: undefined }
      contact_client_ids: { Args: never; Returns: string[] }
      has_client_access: { Args: { cid: string }; Returns: boolean }
      post_change_status: {
        Args: {
          p_comment?: string
          p_post_id: string
          p_to: Database["public"]["Enums"]["post_status_t"]
        }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_fetched_at: string | null
          canva_thumbnail_source: string | null
          canva_thumbnail_url: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          scheduled_at: string
          search_tsv: unknown
          status: Database["public"]["Enums"]["post_status_t"]
          status_changed_at: string
          status_changed_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      post_duplicate: {
        Args: { p_post_id: string; p_shift_days?: number }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_fetched_at: string | null
          canva_thumbnail_source: string | null
          canva_thumbnail_url: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          scheduled_at: string
          search_tsv: unknown
          status: Database["public"]["Enums"]["post_status_t"]
          status_changed_at: string
          status_changed_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      post_restore: {
        Args: { p_post_id: string }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_fetched_at: string | null
          canva_thumbnail_source: string | null
          canva_thumbnail_url: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          scheduled_at: string
          search_tsv: unknown
          status: Database["public"]["Enums"]["post_status_t"]
          status_changed_at: string
          status_changed_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      post_trash: { Args: { p_post_id: string }; Returns: undefined }
      purge_trash: {
        Args: never
        Returns: {
          error: string | null
          finished_at: string | null
          id: number
          job_name: string
          ok: boolean | null
          started_at: string
          stats: Json
        }
        SetofOptions: {
          from: "*"
          to: "job_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_needs_comment: {
        Args: {
          p_from: Database["public"]["Enums"]["post_status_t"]
          p_to: Database["public"]["Enums"]["post_status_t"]
        }
        Returns: boolean
      }
      trash_purge_now: {
        Args: { p_entity: string; p_id: string }
        Returns: undefined
      }
    }
    Enums: {
      comment_visibility_t: "internal" | "client"
      network_t:
        | "instagram"
        | "linkedin"
        | "facebook"
        | "tiktok"
        | "x"
        | "youtube"
        | "pinterest"
        | "threads"
      post_status_t:
        | "draft"
        | "internal_review"
        | "client_review"
        | "approved"
        | "scheduled"
        | "published"
      role_t: "cm" | "lead" | "admin" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      comment_visibility_t: ["internal", "client"],
      network_t: [
        "instagram",
        "linkedin",
        "facebook",
        "tiktok",
        "x",
        "youtube",
        "pinterest",
        "threads",
      ],
      post_status_t: [
        "draft",
        "internal_review",
        "client_review",
        "approved",
        "scheduled",
        "published",
      ],
      role_t: ["cm", "lead", "admin", "client"],
    },
  },
} as const
