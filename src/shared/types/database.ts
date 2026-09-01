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
      alerts: {
        Row: {
          client_id: string | null
          created_at: string
          dedupe_key: string
          id: string
          message: string
          organization_id: string | null
          post_id: string | null
          severity: string
          status: Database["public"]["Enums"]["alert_status_t"]
          target_role: Database["public"]["Enums"]["role_t"] | null
          target_user_id: string | null
          type: Database["public"]["Enums"]["alert_type_t"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          dedupe_key: string
          id?: string
          message: string
          organization_id?: string | null
          post_id?: string | null
          severity?: string
          status?: Database["public"]["Enums"]["alert_status_t"]
          target_role?: Database["public"]["Enums"]["role_t"] | null
          target_user_id?: string | null
          type: Database["public"]["Enums"]["alert_type_t"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          dedupe_key?: string
          id?: string
          message?: string
          organization_id?: string | null
          post_id?: string | null
          severity?: string
          status?: Database["public"]["Enums"]["alert_status_t"]
          target_role?: Database["public"]["Enums"]["role_t"] | null
          target_user_id?: string | null
          type?: Database["public"]["Enums"]["alert_type_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          organization_id: string
          starts_on: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string
          ends_on: string
          id?: string
          name: string
          organization_id?: string
          starts_on: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          ends_on?: string
          id?: string
          name?: string
          organization_id?: string
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
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
        }
        Insert: {
          auth_user_id?: string | null
          client_id: string
          created_at?: string
          email: string
          full_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string
        }
        Update: {
          auth_user_id?: string | null
          client_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string
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
          {
            foreignKeyName: "client_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          cadence: string
          channels: string
          client_id: string
          notes: string
          organization_id: string
          scope: string
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cadence?: string
          channels?: string
          client_id: string
          notes?: string
          organization_id?: string
          scope?: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cadence?: string
          channels?: string
          client_id?: string
          notes?: string
          organization_id?: string
          scope?: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credentials: {
        Row: {
          client_id: string
          created_at: string
          id: string
          label: string
          login: string
          notes: string
          organization_id: string
          secret: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          label?: string
          login?: string
          notes?: string
          organization_id?: string
          secret?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          label?: string
          login?: string
          notes?: string
          organization_id?: string
          secret?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pillars: {
        Row: {
          client_id: string
          created_at: string
          id: string
          label: string
          organization_id: string
          sort_order: number
          target_pct: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          label: string
          organization_id?: string
          sort_order?: number
          target_pct?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          sort_order?: number
          target_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_pillars_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_pillars_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_pillars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_request_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          organization_id: string
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          organization_id?: string
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_request_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_request_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "client_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      client_requests: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["client_request_status_t"]
          title: string
          updated_at: string
          wanted_date: string | null
          wanted_network: Database["public"]["Enums"]["network_t"] | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["client_request_status_t"]
          title: string
          updated_at?: string
          wanted_date?: string | null
          wanted_network?: Database["public"]["Enums"]["network_t"] | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["client_request_status_t"]
          title?: string
          updated_at?: string
          wanted_date?: string | null
          wanted_network?: Database["public"]["Enums"]["network_t"] | null
        }
        Relationships: [
          {
            foreignKeyName: "client_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
          sector: string | null
          skip_client_review: boolean
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
          organization_id?: string
          sector?: string | null
          skip_client_review?: boolean
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
          organization_id?: string
          sector?: string | null
          skip_client_review?: boolean
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
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_guidelines: {
        Row: {
          brand_colors: Json
          client_id: string
          good_examples: string
          organization_id: string
          tone: string
          typography: string
          updated_at: string
          updated_by: string | null
          visual_guidelines: string
          words_to_avoid: string
          words_to_prefer: string
        }
        Insert: {
          brand_colors?: Json
          client_id: string
          good_examples?: string
          organization_id?: string
          tone?: string
          typography?: string
          updated_at?: string
          updated_by?: string | null
          visual_guidelines?: string
          words_to_avoid?: string
          words_to_prefer?: string
        }
        Update: {
          brand_colors?: Json
          client_id?: string
          good_examples?: string
          organization_id?: string
          tone?: string
          typography?: string
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
            foreignKeyName: "editorial_guidelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      idea_tags: {
        Row: {
          idea_id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          idea_id: string
          organization_id?: string
          tag_id: string
        }
        Update: {
          idea_id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_tags_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          organization_id: string
          origin_request_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          organization_id?: string
          origin_request_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          organization_id?: string
          origin_request_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_origin_request_id_fkey"
            columns: ["origin_request_id"]
            isOneToOne: false
            referencedRelation: "client_requests"
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
      key_dates: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          event_date: string
          id: string
          name: string
          organization_id: string | null
          recurring_annually: boolean
          scope: Database["public"]["Enums"]["key_date_scope_t"]
          sector: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          event_date: string
          id?: string
          name: string
          organization_id?: string | null
          recurring_annually?: boolean
          scope: Database["public"]["Enums"]["key_date_scope_t"]
          sector?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          event_date?: string
          id?: string
          name?: string
          organization_id?: string | null
          recurring_annually?: boolean
          scope?: Database["public"]["Enums"]["key_date_scope_t"]
          sector?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_dates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_dates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_dates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_dates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          client_id: string | null
          created_at: string
          email_sent_at: string | null
          id: string
          organization_id: string
          post_id: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string
          client_id?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          organization_id?: string
          post_id?: string | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          client_id?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          organization_id?: string
          post_id?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
          {
            foreignKeyName: "onboarding_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string | null
          org_name: string
          organization_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          org_name: string
          organization_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          org_name?: string
          organization_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          key: string
          organization_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string | null
          plan: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string | null
          plan?: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string | null
          plan?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_approval_tokens: {
        Row: {
          created_at: string
          organization_id: string
          post_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          organization_id?: string
          post_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          organization_id?: string
          post_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_approval_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_approval_tokens_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
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
          kind: string
          organization_id: string
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
          kind?: string
          organization_id?: string
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
          kind?: string
          organization_id?: string
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
            foreignKeyName: "post_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
            foreignKeyName: "post_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      post_media: {
        Row: {
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          height: number | null
          id: string
          kind: string
          mime_type: string
          organization_id: string
          position: number
          post_id: string
          size_bytes: number
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind: string
          mime_type?: string
          organization_id?: string
          position?: number
          post_id: string
          size_bytes?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string
          organization_id?: string
          position?: number
          post_id?: string
          size_bytes?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          organization_id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          organization_id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          organization_id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      post_templates: {
        Row: {
          caption_template: string
          client_id: string | null
          created_at: string
          created_by: string
          default_tags: string[]
          description: string
          id: string
          name: string
          network: Database["public"]["Enums"]["network_t"] | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          caption_template?: string
          client_id?: string | null
          created_at?: string
          created_by: string
          default_tags?: string[]
          description?: string
          id?: string
          name: string
          network?: Database["public"]["Enums"]["network_t"] | null
          organization_id?: string
          updated_at?: string
        }
        Update: {
          caption_template?: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          default_tags?: string[]
          description?: string
          id?: string
          name?: string
          network?: Database["public"]["Enums"]["network_t"] | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
          canva_url?: string | null
          caption?: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id?: string
          origin_id?: string | null
          origin_type?: string | null
          performance_note?: string | null
          performance_visible_to_client?: boolean
          pillar_id?: string | null
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
          canva_url?: string | null
          caption?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          network?: Database["public"]["Enums"]["network_t"]
          organization_id?: string
          origin_id?: string | null
          origin_type?: string | null
          performance_note?: string | null
          performance_visible_to_client?: boolean
          pillar_id?: string | null
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
            foreignKeyName: "posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "client_pillars"
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
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          organization_id: string | null
          role: Database["public"]["Enums"]["role_t"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          organization_id?: string | null
          role?: Database["public"]["Enums"]["role_t"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          role?: Database["public"]["Enums"]["role_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          client_id: string
          created_at: string
          handle: string
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          handle: string
          id?: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          handle?: string
          id?: string
          network?: Database["public"]["Enums"]["network_t"]
          organization_id?: string
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
          {
            foreignKeyName: "social_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      client_activity: {
        Row: {
          action: string | null
          actor_id: string | null
          actor_name: string | null
          client_id: string | null
          created_at: string | null
          field: string | null
          history_id: number | null
          network: Database["public"]["Enums"]["network_t"] | null
          new_value: string | null
          old_value: string | null
          post_caption: string | null
          post_id: string | null
          scheduled_at: string | null
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
      _client_pending_post: {
        Args: { p_post_id: string }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
      _contact_display_name: { Args: { p_client_id: string }; Returns: string }
      _thr: { Args: { p_default: number; p_key: string }; Returns: number }
      accept_org_invitation: {
        Args: { p_full_name?: string; p_org_name?: string; p_token: string }
        Returns: Json
      }
      alert_thresholds: { Args: never; Returns: Json }
      approve_post: {
        Args: { p_post_id: string }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
      approve_via_token: { Args: { p_token: string }; Returns: string }
      auth_is_active: { Args: never; Returns: boolean }
      auth_org: { Args: never; Returns: string }
      auth_role: { Args: never; Returns: Database["public"]["Enums"]["role_t"] }
      auto_publish_due: {
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
      can_see_client_request: { Args: { cid: string }; Returns: boolean }
      can_see_idea: { Args: { p_client_id: string }; Returns: boolean }
      can_see_scoped: { Args: { p_client_id: string }; Returns: boolean }
      can_transition: {
        Args: {
          p_client_id?: string
          p_from: Database["public"]["Enums"]["post_status_t"]
          p_role: Database["public"]["Enums"]["role_t"]
          p_to: Database["public"]["Enums"]["post_status_t"]
        }
        Returns: boolean
      }
      client_contact_user_ids: {
        Args: { p_client_id: string }
        Returns: string[]
      }
      client_restore: { Args: { p_client_id: string }; Returns: undefined }
      client_trash: { Args: { p_client_id: string }; Returns: undefined }
      contact_client_ids: { Args: never; Returns: string[] }
      create_org_invitation: {
        Args: { p_email: string; p_full_name?: string; p_org_name: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string | null
          org_name: string
          organization_id: string | null
          token: string
        }
        SetofOptions: {
          from: "*"
          to: "org_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dispatch_emails_tick: { Args: never; Returns: undefined }
      generate_alerts: {
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
      has_client_access: { Args: { cid: string }; Returns: boolean }
      idea_to_post: {
        Args: {
          p_client_id?: string
          p_idea_id: string
          p_network?: Database["public"]["Enums"]["network_t"]
          p_scheduled_at?: string
        }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
      is_platform_admin: { Args: never; Returns: boolean }
      key_date_to_post: {
        Args: {
          p_client_id: string
          p_key_date_id: string
          p_network?: Database["public"]["Enums"]["network_t"]
          p_year?: number
        }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
      key_dates_for_client: {
        Args: { p_client_id: string }
        Returns: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          event_date: string
          id: string
          name: string
          organization_id: string | null
          recurring_annually: boolean
          scope: Database["public"]["Enums"]["key_date_scope_t"]
          sector: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "key_dates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      notify: {
        Args: {
          p_actor_id?: string
          p_body: string
          p_client_id?: string
          p_post_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      org_invitation_by_token: { Args: { p_token: string }; Returns: Json }
      post_by_approval_token: { Args: { p_token: string }; Returns: Json }
      post_change_status: {
        Args: {
          p_comment?: string
          p_post_id: string
          p_to: Database["public"]["Enums"]["post_status_t"]
        }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
      post_media_reorder: {
        Args: { p_ids: string[]; p_post_id: string }
        Returns: undefined
      }
      post_restore: {
        Args: { p_post_id: string }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
      reject_post: {
        Args: { p_comment: string; p_post_id: string }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
      reject_via_token: {
        Args: { p_comment: string; p_token: string }
        Returns: string
      }
      remind_client_review: { Args: { p_post_id: string }; Returns: undefined }
      request_to_post: {
        Args: {
          p_network?: Database["public"]["Enums"]["network_t"]
          p_request_id: string
          p_scheduled_at?: string
        }
        Returns: {
          author_id: string
          campaign_id: string | null
          canva_url: string | null
          caption: string
          client_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          network: Database["public"]["Enums"]["network_t"]
          organization_id: string
          origin_id: string | null
          origin_type: string | null
          performance_note: string | null
          performance_visible_to_client: boolean
          pillar_id: string | null
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
      trigger_generate_alerts: {
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
      trigger_purge_trash: {
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
      workflow_skips_internal: { Args: never; Returns: boolean }
    }
    Enums: {
      alert_status_t: "new" | "seen" | "dismissed"
      alert_type_t:
        | "validation_overdue"
        | "deadline_unvalidated"
        | "calendar_gap"
        | "missing_canva"
        | "keydate_unplanned"
        | "client_inactive"
        | "publish_reminder"
      client_request_status_t: "nouvelle" | "prise_en_compte" | "traitee"
      comment_visibility_t: "internal" | "client"
      key_date_scope_t: "global" | "sector" | "client"
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
      alert_status_t: ["new", "seen", "dismissed"],
      alert_type_t: [
        "validation_overdue",
        "deadline_unvalidated",
        "calendar_gap",
        "missing_canva",
        "keydate_unplanned",
        "client_inactive",
        "publish_reminder",
      ],
      client_request_status_t: ["nouvelle", "prise_en_compte", "traitee"],
      comment_visibility_t: ["internal", "client"],
      key_date_scope_t: ["global", "sector", "client"],
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
