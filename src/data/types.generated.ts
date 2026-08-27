export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brand_kits: {
        Row: {
          accent_color: string
          address: string | null
          bg_color: string
          company_name: string
          contacts: Json
          created_at: string
          default_intro: string | null
          default_valid_days: number
          font_family: string
          footer_text: string | null
          header_logo: string
          logo_dark_path: string | null
          logo_light_path: string | null
          opening_hours: Json
          signer_name: string | null
          signer_title: string | null
          tax_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accent_color?: string
          address?: string | null
          bg_color?: string
          company_name?: string
          contacts?: Json
          created_at?: string
          default_intro?: string | null
          default_valid_days?: number
          font_family?: string
          footer_text?: string | null
          header_logo?: string
          logo_dark_path?: string | null
          logo_light_path?: string | null
          opening_hours?: Json
          signer_name?: string | null
          signer_title?: string | null
          tax_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accent_color?: string
          address?: string | null
          bg_color?: string
          company_name?: string
          contacts?: Json
          created_at?: string
          default_intro?: string | null
          default_valid_days?: number
          font_family?: string
          footer_text?: string | null
          header_logo?: string
          logo_dark_path?: string | null
          logo_light_path?: string | null
          opening_hours?: Json
          signer_name?: string | null
          signer_title?: string | null
          tax_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          archived_at: string | null
          avatar_path: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          doc_type: string | null
          id: string
          kind: string
          mime: string | null
          name: string
          project_id: string | null
          quote_id: string | null
          quote_version: number | null
          size_bytes: number
          storage_path: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doc_type?: string | null
          id?: string
          kind?: string
          mime?: string | null
          name: string
          project_id?: string | null
          quote_id?: string | null
          quote_version?: number | null
          size_bytes: number
          storage_path: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doc_type?: string | null
          id?: string
          kind?: string
          mime?: string | null
          name?: string
          project_id?: string | null
          quote_id?: string | null
          quote_version?: number | null
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      library_categories: {
        Row: {
          code: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_sample: boolean
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          code?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_sample?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          code?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_sample?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      library_groups: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          items: Json
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          items?: Json
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          items?: Json
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          is_sample: boolean
          kind: string
          min_price_cents: number | null
          name: string
          pricing: Json
          pricing_basis: string
          sort_order: number
          unit: string
          unit_label: string | null
          unit_price_cents: number | null
          updated_at: string
          variant_of: string | null
          workspace_id: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          is_sample?: boolean
          kind?: string
          min_price_cents?: number | null
          name: string
          pricing?: Json
          pricing_basis?: string
          sort_order?: number
          unit?: string
          unit_label?: string | null
          unit_price_cents?: number | null
          updated_at?: string
          variant_of?: string | null
          workspace_id: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          is_sample?: boolean
          kind?: string
          min_price_cents?: number | null
          name?: string
          pricing?: Json
          pricing_basis?: string
          sort_order?: number
          unit?: string
          unit_label?: string | null
          unit_price_cents?: number | null
          updated_at?: string
          variant_of?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "library_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_items_variant_of_fkey"
            columns: ["variant_of"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_workspace_id: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          default_workspace_id?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          default_workspace_id?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          area_m2: number | null
          city: string | null
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          kind: string | null
          name: string
          notes: string | null
          sort_order: number
          stage_progress: Json
          start_date: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address?: string | null
          area_m2?: number | null
          city?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string | null
          name: string
          notes?: string | null
          sort_order?: number
          stage_progress?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address?: string | null
          area_m2?: number | null
          city?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string | null
          name?: string
          notes?: string | null
          sort_order?: number
          stage_progress?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_acceptances: {
        Row: {
          accepted_at: string
          accepted_body: Json
          decision: string
          enabled_item_ids: string[]
          id: string
          reason: string | null
          quote_id: string
          share_id: string | null
          signer_ip: unknown
          signer_name: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_body: Json
          enabled_item_ids?: string[]
          id?: string
          quote_id: string
          share_id?: string | null
          signer_ip?: unknown
          signer_name?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_body?: Json
          decision?: string
          enabled_item_ids?: string[]
          id?: string
          reason?: string | null
          quote_id?: string
          share_id?: string | null
          signer_ip?: unknown
          signer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_acceptances_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_acceptances_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "quote_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_comments: {
        Row: {
          author_ip: unknown
          author_name: string | null
          created_at: string
          id: string
          message: string
          quote_id: string
          read_at: string | null
          share_id: string | null
        }
        Insert: {
          author_ip?: unknown
          author_name?: string | null
          created_at?: string
          id?: string
          message: string
          quote_id: string
          read_at?: string | null
          share_id?: string | null
        }
        Update: {
          author_ip?: unknown
          author_name?: string | null
          created_at?: string
          id?: string
          message?: string
          quote_id?: string
          read_at?: string | null
          share_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_comments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_comments_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "quote_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          first_viewed_at: string | null
          id: string
          last_viewed_at: string | null
          quote_id: string
          revoked_at: string | null
          token: string
          view_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          quote_id: string
          revoked_at?: string | null
          token?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          quote_id?: string
          revoked_at?: string | null
          token?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_shares_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          body: Json
          created_at: string
          documents: Json | null
          id: string
          name: string
          schedule: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body: Json
          created_at?: string
          documents?: Json | null
          id?: string
          name: string
          schedule?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body?: Json
          created_at?: string
          documents?: Json | null
          id?: string
          name?: string
          schedule?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          body: Json
          city: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          doc_kind: string
          documents: Json | null
          id: string
          internal_notes: string | null
          lineage_id: string
          number: string | null
          project_id: string | null
          schedule: Json | null
          sent_at: string | null
          status: string
          title: string
          total_gross_cents: number
          total_net_cents: number
          updated_at: string
          valid_until: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          body: Json
          city?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          doc_kind?: string
          documents?: Json | null
          id?: string
          internal_notes?: string | null
          lineage_id: string
          number?: string | null
          project_id?: string | null
          schedule?: Json | null
          sent_at?: string | null
          status?: string
          title?: string
          total_gross_cents?: number
          total_net_cents?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          body?: Json
          city?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          doc_kind?: string
          documents?: Json | null
          id?: string
          internal_notes?: string | null
          lineage_id?: string
          number?: string | null
          project_id?: string | null
          schedule?: Json | null
          sent_at?: string | null
          status?: string
          title?: string
          total_gross_cents?: number
          total_net_cents?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          plan: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          quote_seq: number
          settings: Json
          storage_quota_bytes: number
          storage_used_bytes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          quote_seq?: number
          settings?: Json
          storage_quota_bytes?: number
          storage_used_bytes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          quote_seq?: number
          settings?: Json
          storage_quota_bytes?: number
          storage_used_bytes?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      clients_overview: {
        Row: {
          accepted_net_cents: number | null
          address: string | null
          archived_at: string | null
          avatar_path: string | null
          city: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string | null
          last_activity_at: string | null
          name: string | null
          notes: string | null
          phone: string | null
          projects_count: number | null
          quotes_count: number | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_overview: {
        Row: {
          accepted_net_cents: number | null
          address: string | null
          area_m2: number | null
          city: string | null
          client_avatar_path: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          deleted_at: string | null
          id: string | null
          kind: string | null
          last_activity_at: string | null
          name: string | null
          notes: string | null
          quotes_count: number | null
          sort_order: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_shared_quote: {
        Args: {
          p_enabled_ids: string[]
          p_signer_name: string
          p_token: string
        }
        Returns: Json
      }
      comment_shared_quote: {
        Args: { p_author_name: string; p_message: string; p_token: string }
        Returns: Json
      }
      reject_shared_quote: {
        Args: { p_reason?: string | null; p_signer_name: string; p_token: string }
        Returns: Json
      }
      files_bump_usage: {
        Args: { delta: number; ws: string }
        Returns: undefined
      }
      files_expired_in_trash: {
        Args: { ws: string }
        Returns: {
          id: string
          storage_path: string
        }[]
      }
      files_trash_days: { Args: never; Returns: number }
      get_shared_quote: { Args: { p_token: string }; Returns: Json }
      is_member: { Args: { ws: string }; Returns: boolean }
      is_quote_member: { Args: { q: string }; Returns: boolean }
      is_workspace_owner: { Args: { ws: string }; Returns: boolean }
      library_item_usage: {
        Args: { ws: string }
        Returns: {
          item_id: string
          last_used_at: string
          quotes_count: number
        }[]
      }
      next_quote_number: { Args: { ws: string }; Returns: string }
      quote_can_write: { Args: { q: string }; Returns: boolean }
      request_ip: { Args: never; Returns: unknown }
      resolve_share: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          expires_at: string | null
          first_viewed_at: string | null
          id: string
          last_viewed_at: string | null
          quote_id: string
          revoked_at: string | null
          token: string
          view_count: number
        }
        SetofOptions: {
          from: "*"
          to: "quote_shares"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seed_library_sample: { Args: { ws: string }; Returns: undefined }
      seed_room_types: { Args: { ws: string }; Returns: undefined }
      share_status: { Args: { p_token: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      storage_workspace_id: { Args: { object_name: string }; Returns: string }
      workspace_can_write: { Args: { ws: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

