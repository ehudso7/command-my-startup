export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          referral_code: string | null
          referred_by: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      commands: {
        Row: {
          id: string
          user_id: string
          prompt: string
          response: string
          model: string
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt: string
          response: string
          model: string
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt?: string
          response?: string
          model?: string
          tokens_used?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commands_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key: string
          name: string
          created_at: string
          last_used_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          key: string
          name: string
          created_at?: string
          last_used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          key?: string
          name?: string
          created_at?: string
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_email: string
          referred_user_id: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_email: string
          referred_user_id?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_email?: string
          referred_user_id?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper type for Supabase tables
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type NewRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
