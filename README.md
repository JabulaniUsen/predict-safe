# PredictSafe - Bet Prediction Web App

A comprehensive bet prediction web application built with Next.js, Supabase, and Tailwind CSS.

## Features

### User Features
- **Homepage** with hero section, free predictions, VIP packages display
- **User Dashboard** with subscription management
- **Plan Cards** with countdown timers and status indicators
- **Predictions Display** with plan-specific filtering
- **Two-Step Payment** for Correct Score package
- **Country & Currency** selection and display
- **Profile Settings** for account management

### Admin Features
- **Admin Dashboard** with KPIs and analytics
- **Predictions Management** (manual upload and API sync)
- **Plans Management** with pricing configuration
- **Users Management** with subscription control
- **Site Configuration** for content management
- **Correct Score Activation** manual approval

### Technical Features
- Supabase Authentication
- Row Level Security (RLS) policies
- Payment gateway integration (Flutterwave, Paystack, Stripe)
- API Football integration for fixtures and standings
- Responsive design with Tailwind CSS and Shadcn/ui

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- API Football account (paid tier)
- Payment gateway accounts (optional for development)

### 1. Clone and Install

```bash
cd predict-safe
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Football
API_FOOTBALL_KEY=1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac
API_FOOTBALL_BASE_URL=https://apifootball.com/api

# Payment Gateways (Optional for development)
FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `supabase/schema.sql`
4. This will create all necessary tables, indexes, triggers, and RLS policies

### 4. Initial Data

The schema includes initial data for:
- Countries (Nigeria, Ghana, Kenya, United States)
- Default plans (Profit Multiplier, Daily 2 Odds, Standard, Correct Score)
- Default site configuration

### 5. Create Admin User

After creating your first user account, update the `users` table to set `is_admin = true`:

```sql
UPDATE users SET is_admin = true WHERE email = 'your-admin-email@example.com';
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
predict-safe/
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin dashboard pages
│   ├── dashboard/        # User dashboard pages
│   ├── login/            # Authentication pages
│   ├── signup/
│   ├── subscribe/        # Subscription flow
│   ├── payment/          # Payment processing
│   └── api/              # API routes (webhooks)
├── components/           # React components
│   ├── admin/            # Admin components
│   ├── dashboard/        # Dashboard components
│   ├── home/             # Homepage components
│   ├── layout/           # Layout components
│   └── ui/               # Shadcn/ui components
├── lib/                  # Utility functions
│   ├── supabase/         # Supabase clients
│   ├── api-football.ts   # API Football integration
│   └── utils/            # Helper functions
├── types/                # TypeScript types
├── supabase/             # Database schema
│   └── schema.sql       # SQL schema file
└── public/               # Static assets
```

## Key Features Implementation

### Subscription Status Logic

- **Locked**: User has never paid for the plan
- **Pending Activation**: User paid subscription fee but not activation fee (Correct Score only)
- **Active**: User fully subscribed with countdown timer
- **Expired**: Subscription has expired

### Payment Flow

1. User selects plan and duration
2. System determines payment gateway based on country
3. Payment is processed via webhook
4. Subscription status is updated automatically

### Correct Score Two-Step Payment

1. User pays subscription fee → Status: Pending Activation
2. Admin manually activates → Status: Active (timer starts)

### Plan-Specific Filtering

- **Profit Multiplier**: Odds 2.80-4.30, Confidence 60-100
- **Daily 2 Odds**: Minimum 2+ odds, Confidence 60-100
- **Standard Plan**: Confidence 60-100
- **Correct Score**: Manual admin uploads only

## Payment Gateway Integration

### Flutterwave
- Webhook endpoint: `/api/webhooks/flutterwave`
- Configure in Flutterwave dashboard

### Paystack
- Webhook endpoint: `/api/webhooks/paystack`
- Configure in Paystack dashboard

### Stripe
- Webhook endpoint: `/api/webhooks/stripe`
- Configure in Stripe dashboard

## API Football Integration

The app integrates with API Football for:
- Fixtures (today, tomorrow, previous)
- League standings (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)
- Game data filtering by odds and confidence

## Admin Access

To access the admin dashboard:
1. Create a user account
2. Set `is_admin = true` in the `users` table
3. Navigate to `/admin`

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Vercel (recommended):
   - Connect your GitHub repository
   - Add environment variables
   - Deploy

3. Configure webhooks:
   - Update webhook URLs in payment gateway dashboards
   - Point to: `https://your-domain.com/api/webhooks/{gateway}`

## Notes

- Payment processing in `/app/payment/page.tsx` currently simulates payments for development
- Replace with actual payment gateway initialization in production
- Email notifications system structure is in place but needs email service integration
- API Football integration is ready but may need rate limiting in production

## License

This project is proprietary software.
