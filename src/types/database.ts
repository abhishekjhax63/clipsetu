/**
 * CLIPSETU database type definitions.
 * This file should be generated from the Supabase schema in production.
 * For now, this is a hand-maintained placeholder matching our planned schema.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      campaigns: {
        Row: {
          id: string;
          brand_id: string;
          title: string;
          description: string;
          category: string;
          type: string;
          status: string;
          budget: number;
          reward_per_1k: number;
          max_reward_per_submission: number;
          max_campaign_reward: number;
          min_views: number;
          start_date: string | null;
          end_date: string | null;
          submission_deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
      };
      submissions: {
        Row: {
          id: string;
          campaign_id: string;
          creator_id: string;
          platform: string;
          post_url: string;
          status: string;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["submissions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["submissions"]["Row"]>;
      };
      wallet_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          direction: "credit" | "debit";
          amount: number;
          status: string;
          idempotency_key: string | null;
          related_payment_ref: string | null;
          campaign_id: string | null;
          submission_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["wallet_transactions"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["wallet_transactions"]["Row"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
