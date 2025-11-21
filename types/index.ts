import { Database } from './database'

export type Plan = Database['public']['Tables']['plans']['Row']
export type PlanPrice = Database['public']['Tables']['plan_prices']['Row']
export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row']
export type Prediction = Database['public']['Tables']['predictions']['Row']
export type CorrectScorePrediction = Database['public']['Tables']['correct_score_predictions']['Row']
export type Country = Database['public']['Tables']['countries']['Row']
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type VIPWinning = Database['public']['Tables']['vip_winnings']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

export type PlanStatus = 'inactive' | 'pending_activation' | 'active' | 'expired'
export type PredictionStatus = 'not_started' | 'live' | 'finished'
export type PaymentGateway = 'flutterwave' | 'paystack' | 'stripe'
export type PaymentType = 'subscription' | 'activation'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface PlanWithPrice extends Plan {
  prices: PlanPrice[]
}

export interface UserSubscriptionWithPlan extends UserSubscription {
  plan: Plan
  plan_price?: PlanPrice
}

export interface PredictionFilter {
  type?: string
  date?: 'previous' | 'today' | 'tomorrow'
}

