/**
 * WYGENEROWANE PRZEZ `pnpm db:types`
 * (`supabase gen types typescript --local > src/data/types.generated.ts`)
 *
 * UWAGA: ten plik jest NADPISYWANY przez Supabase CLI. Nie edytuj go ręcznie —
 * zmiany rób w `supabase/migrations/*.sql`, potem przegeneruj typy.
 *
 * Poniższa wersja jest tymczasowym, ręcznie spisanym odpowiednikiem schematu
 * z migracji 0001–0005. Istnieje po to, żeby `pnpm typecheck` przechodził,
 * zanim ktokolwiek odpali lokalny stack Supabase (wymaga Dockera).
 * Po pierwszym `pnpm db:reset && pnpm db:types` zostanie zastąpiona wersją z CLI.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type LibraryItemKind = 'item' | 'discount';
export type WorkspaceRole = 'owner' | 'member';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'
  | 'paused';

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          settings: Json;
          quote_seq: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          settings?: Json;
          quote_seq?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          settings?: Json;
          quote_seq?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          default_workspace_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          default_workspace_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          default_workspace_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      brand_kits: {
        Row: {
          workspace_id: string;
          company_name: string;
          logo_dark_path: string | null;
          logo_light_path: string | null;
          accent_color: string;
          bg_color: string;
          font_family: string;
          contacts: Json;
          address: string | null;
          tax_id: string | null;
          footer_text: string | null;
          default_intro: string | null;
          default_valid_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          company_name?: string;
          logo_dark_path?: string | null;
          logo_light_path?: string | null;
          accent_color?: string;
          bg_color?: string;
          font_family?: string;
          contacts?: Json;
          address?: string | null;
          tax_id?: string | null;
          footer_text?: string | null;
          default_intro?: string | null;
          default_valid_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          company_name?: string;
          logo_dark_path?: string | null;
          logo_light_path?: string | null;
          accent_color?: string;
          bg_color?: string;
          font_family?: string;
          contacts?: Json;
          address?: string | null;
          tax_id?: string | null;
          footer_text?: string | null;
          default_intro?: string | null;
          default_valid_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string | null;
          number: string | null;
          title: string;
          status: QuoteStatus;
          body: Json;
          total_net_cents: number;
          total_gross_cents: number;
          currency: string;
          client_name: string | null;
          sent_at: string | null;
          accepted_at: string | null;
          valid_until: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          client_id?: string | null;
          number?: string | null;
          title?: string;
          status?: QuoteStatus;
          body: Json;
          total_net_cents?: number;
          total_gross_cents?: number;
          currency?: string;
          client_name?: string | null;
          sent_at?: string | null;
          accepted_at?: string | null;
          valid_until?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          client_id?: string | null;
          number?: string | null;
          title?: string;
          status?: QuoteStatus;
          body?: Json;
          total_net_cents?: number;
          total_gross_cents?: number;
          currency?: string;
          client_name?: string | null;
          sent_at?: string | null;
          accepted_at?: string | null;
          valid_until?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      quote_templates: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          body: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          body: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          body?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      library_items: {
        Row: {
          id: string;
          workspace_id: string;
          category: string;
          kind: LibraryItemKind;
          name: string;
          description: string;
          unit_price_cents: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          category?: string;
          kind?: LibraryItemKind;
          name: string;
          description?: string;
          unit_price_cents?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          category?: string;
          kind?: LibraryItemKind;
          name?: string;
          description?: string;
          unit_price_cents?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      library_groups: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          items: Json;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          items?: Json;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          items?: Json;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          workspace_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: SubscriptionStatus;
          plan: string | null;
          trial_ends_at: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: SubscriptionStatus;
          plan?: string | null;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: SubscriptionStatus;
          plan?: string | null;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: { id: string; type: string; processed_at: string };
        Insert: { id: string; type: string; processed_at?: string };
        Update: { id?: string; type?: string; processed_at?: string };
        Relationships: [];
      };
      quote_shares: {
        Row: {
          id: string;
          quote_id: string;
          token: string;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          token: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          token?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quote_acceptances: {
        Row: {
          id: string;
          quote_id: string;
          share_id: string | null;
          accepted_body: Json;
          signer_name: string | null;
          signer_ip: string | null;
          signature_path: string | null;
          accepted_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          share_id?: string | null;
          accepted_body: Json;
          signer_name?: string | null;
          signer_ip?: string | null;
          signature_path?: string | null;
          accepted_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          share_id?: string | null;
          accepted_body?: Json;
          signer_name?: string | null;
          signer_ip?: string | null;
          signature_path?: string | null;
          accepted_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_member: { Args: { ws: string }; Returns: boolean };
      is_workspace_owner: { Args: { ws: string }; Returns: boolean };
      workspace_can_write: { Args: { ws: string }; Returns: boolean };
      is_quote_member: { Args: { q: string }; Returns: boolean };
      quote_can_write: { Args: { q: string }; Returns: boolean };
      next_quote_number: { Args: { ws: string }; Returns: string };
      storage_workspace_id: { Args: { object_name: string }; Returns: string | null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Skróty używane w repozytoriach (`src/data/repos/*`). */
export type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type DbFunctions = PublicSchema['Functions'];
