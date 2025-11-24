# Notifications System Setup

This document explains how to set up the notifications system with email functionality.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# SMTP Configuration (Google SMTP)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Site URL (for email links)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Admin Email (optional, defaults to SMTP_USER)
ADMIN_EMAIL=admin@yourdomain.com

# System API Token (optional, for automated checks)
SYSTEM_API_TOKEN=your-secure-token-here
```

## Google SMTP Setup

1. **Enable 2-Step Verification** on your Google account
2. **Generate an App Password**:
   - Go to your Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASSWORD`

## Features Implemented

### User Notifications
- ✅ Predictions dropped for a plan
- ✅ Subscription confirmed
- ✅ Subscription expired
- ✅ Subscription removed

### Admin Notifications
- ✅ New subscription created

### Notification Pages
- ✅ User dashboard notifications page (`/dashboard/notifications`)
- ✅ Admin dashboard notifications page (`/admin/notifications`)

### Email Templates
All notifications are sent via email with beautiful HTML templates.

## Notification Triggers

1. **Prediction Drops**: Automatically triggered when predictions are synced via the admin panel
2. **Subscription Confirmed**: Triggered when a subscription payment is completed
3. **Subscription Expired**: Checked when user visits dashboard (can also be triggered via API)
4. **Subscription Removed**: Can be triggered manually or via API
5. **Admin New Subscription**: Triggered when a new subscription is created

## API Endpoints

### Check Expired Subscriptions
```bash
POST /api/notifications/check-expired
Authorization: Bearer YOUR_SYSTEM_TOKEN
```

This endpoint can be called periodically (e.g., via cron job) to check and notify users of expired subscriptions.

## Usage

The notification system is fully integrated and will work automatically once the environment variables are set. Users will receive:
- In-app notifications (visible in the notifications page)
- Email notifications (sent via Google SMTP)

The notification icon in the dashboard header shows the unread count and links to the notifications page.

