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
          country: string
          avatar_url: string | null
          created_at: string
          updated_at: string
          is_admin: boolean
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          country?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          is_admin?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          country?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          is_admin?: boolean
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          benefits: string[] | null
          requires_activation: boolean
          is_active: boolean
          max_predictions_per_day: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          benefits?: string[] | null
          requires_activation?: boolean
          is_active?: boolean
          max_predictions_per_day?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          benefits?: string[] | null
          requires_activation?: boolean
          is_active?: boolean
          max_predictions_per_day?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      plan_prices: {
        Row: {
          id: string
          plan_id: string
          country: string
          duration_days: number
          price: number
          activation_fee: number | null
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          country: string
          duration_days: number
          price: number
          activation_fee?: number | null
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          country?: string
          duration_days?: number
          price?: number
          activation_fee?: number | null
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          plan_status: 'inactive' | 'pending' | 'pending_activation' | 'active' | 'expired'
          subscription_fee_paid: boolean
          activation_fee_paid: boolean
          start_date: string | null
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          plan_status?: 'inactive' | 'pending' | 'pending_activation' | 'active' | 'expired'
          subscription_fee_paid?: boolean
          activation_fee_paid?: boolean
          start_date?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          plan_status?: 'inactive' | 'pending' | 'pending_activation' | 'active' | 'expired'
          subscription_fee_paid?: boolean
          activation_fee_paid?: boolean
          start_date?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      predictions: {
        Row: {
          id: string
          plan_type: 'profit_multiplier' | 'daily_2_odds' | 'standard' | 'free'
          home_team: string
          away_team: string
          league: string
          prediction_type: string
          odds: number
          confidence: number
          kickoff_time: string
          status: 'not_started' | 'live' | 'finished'
          result: 'win' | 'loss' | 'pending' | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_type: 'profit_multiplier' | 'daily_2_odds' | 'standard' | 'free'
          home_team: string
          away_team: string
          league: string
          prediction_type: string
          odds: number
          confidence: number
          kickoff_time: string
          status?: 'not_started' | 'live' | 'finished'
          result?: 'win' | 'loss' | 'pending' | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_type?: 'profit_multiplier' | 'daily_2_odds' | 'standard' | 'free'
          home_team?: string
          away_team?: string
          league?: string
          prediction_type?: string
          odds?: number
          confidence?: number
          kickoff_time?: string
          status?: 'not_started' | 'live' | 'finished'
          result?: 'win' | 'loss' | 'pending' | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      correct_score_predictions: {
        Row: {
          id: string
          home_team: string
          away_team: string
          league: string
          score_prediction: string
          odds: number | null
          kickoff_time: string
          status: 'not_started' | 'live' | 'finished'
          result: 'win' | 'loss' | 'pending' | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          home_team: string
          away_team: string
          league: string
          score_prediction: string
          odds?: number | null
          kickoff_time: string
          status?: 'not_started' | 'live' | 'finished'
          result?: 'win' | 'loss' | 'pending' | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          home_team?: string
          away_team?: string
          league?: string
          score_prediction?: string
          odds?: number | null
          kickoff_time?: string
          status?: 'not_started' | 'live' | 'finished'
          result?: 'win' | 'loss' | 'pending' | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vip_winnings: {
        Row: {
          id: string
          plan_name: string
          home_team: string
          away_team: string
          prediction_type: string
          result: 'win' | 'loss'
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          plan_name: string
          home_team: string
          away_team: string
          prediction_type: string
          result: 'win' | 'loss'
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          plan_name?: string
          home_team?: string
          away_team?: string
          prediction_type?: string
          result?: 'win' | 'loss'
          date?: string
          created_at?: string
        }
      }
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string | null
          featured_image: string | null
          author_id: string
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt?: string | null
          featured_image?: string | null
          author_id: string
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          featured_image?: string | null
          author_id?: string
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      site_config: {
        Row: {
          id: string
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          plan_id: string | null
          amount: number
          currency: string
          payment_gateway: string
          payment_type: 'subscription' | 'activation'
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          gateway_transaction_id: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          plan_id?: string | null
          amount: number
          currency: string
          payment_gateway: string
          payment_type: 'subscription' | 'activation'
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          gateway_transaction_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          plan_id?: string | null
          amount?: number
          currency?: string
          payment_gateway?: string
          payment_type?: 'subscription' | 'activation'
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          gateway_transaction_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          created_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          type: 'bank_transfer' | 'crypto'
          currency: string | null
          details: Json
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'bank_transfer' | 'crypto'
          currency?: string | null
          details: Json
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'bank_transfer' | 'crypto'
          currency?: string | null
          details?: Json
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
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

