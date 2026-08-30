/**
 * Types de la base Supabase.
 *
 * ⚠️ Fichier normalement GÉNÉRÉ par `npm run gen:types`
 * (`supabase gen types typescript --local`). En attendant qu'une instance Supabase
 * (Docker local ou projet cloud) soit disponible, il est maintenu à la main et
 * volontairement minimal — il sera écrasé par la génération dès que possible.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      app_meta: {
        Row: { key: string; value: Json; updated_at: string };
        Insert: { key: string; value?: Json; updated_at?: string };
        Update: { key?: string; value?: Json; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
