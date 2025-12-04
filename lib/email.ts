import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Create transporter for Google SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD, // App password for Gmail
    },
  })
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('SMTP credentials not configured')
      return { success: false, error: 'SMTP not configured' }
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: `"PredictSafe" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message }
  }
}

// Email templates
const LOGO_URL = 'https://wxomppvvpwjvjxvttsog.supabase.co/storage/v1/object/public/logo/ChatGPT%20Image%20Nov%2021,%202025,%2009_18_17%20PM.png'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const BRAND_COLORS = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  green: '#22c55e',
  greenDark: '#16a34a',
  orange: '#f97316',
  orangeDark: '#ea580c',
  red: '#ef4444',
  redDark: '#dc2626',
  purple: '#8b5cf6',
  purpleDark: '#7c3aed',
}

const getEmailStyles = (headerColor: string, headerColorDark: string, buttonColor?: string, buttonColorDark?: string, infoBoxColor?: string) => {
  const btnColor = buttonColor || headerColor
  const btnColorDark = buttonColorDark || headerColorDark
  const infoColor = infoBoxColor || headerColor
  
  return `
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #1f2937; 
      margin: 0; 
      padding: 0; 
      background-color: #f3f4f6;
    }
    .email-wrapper { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, ${headerColor} 0%, ${headerColorDark} 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center;
    }
    .logo { 
      max-width: 180px; 
      height: auto; 
      margin-bottom: 20px;
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: 700;
      color: white;
    }
    .content { 
      padding: 40px 30px; 
      background: #ffffff;
    }
    .content p { 
      margin: 0 0 16px 0; 
      font-size: 16px; 
      color: #374151;
      line-height: 1.6;
    }
    .button { 
      display: inline-block; 
      padding: 14px 32px; 
      background: ${btnColor}; 
      color: #ffffff !important; 
      text-decoration: none; 
      border-radius: 8px; 
      margin: 24px 0;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    .button:hover { 
      background: ${btnColorDark}; 
      color: #ffffff !important;
    }
    .footer { 
      padding: 30px; 
      text-align: center; 
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .footer p { 
      margin: 8px 0; 
      color: #6b7280; 
      font-size: 14px; 
    }
    .info-box { 
      background: #f0f9ff; 
      border-left: 4px solid ${infoColor}; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 24px 0; 
    }
    .info-box p { 
      margin: 8px 0; 
    }
    .alert-box { 
      background: #fef2f2; 
      border-left: 4px solid ${BRAND_COLORS.red}; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 24px 0; 
    }
    .alert-box p { 
      margin: 8px 0; 
    }
  `
}

const baseStyles = getEmailStyles(BRAND_COLORS.primary, BRAND_COLORS.primaryDark)

export const emailTemplates = {
  userWelcome: (fullName?: string | null) => ({
    subject: 'Welcome to PredictSafe!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
                <h1>👋 Welcome${fullName ? `, ${fullName}` : ''}!</h1>
            </div>
            <div class="content">
              <p>Hello${fullName ? ` ${fullName}` : ''},</p>
                <p>Thank you for signing up to <strong style="color: ${BRAND_COLORS.primary};">PredictSafe</strong>.</p>
              <p>You're all set to start exploring premium predictions, VIP plans, and tools to help you win more consistently.</p>
                <div style="text-align: center;">
                  <a href="${SITE_URL}/dashboard" class="button">Go to Dashboard</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>The PredictSafe Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  subscriptionCreated: (planName: string) => ({
    subject: `Subscription Created - ${planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>📦 Subscription Created</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
                <p>Your subscription request for <strong style="color: ${BRAND_COLORS.primary};">${planName}</strong> has been received.</p>
              <p>Your payment proof has been submitted and is <strong>pending admin approval</strong>. You'll receive another email once your payment is approved and your plan is active.</p>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>The PredictSafe Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  predictionDropped: (planName: string) => ({
    subject: `New Predictions Available for ${planName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>🎯 New Predictions Available!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
                <p>Great news! Predictions for <strong style="color: ${BRAND_COLORS.primary};">${planName}</strong> have just been dropped!</p>
              <p>Don't miss out on these opportunities. Log in to your dashboard to view all the latest predictions.</p>
                <div style="text-align: center;">
                  <a href="${SITE_URL}/dashboard/predictions" class="button">View Predictions</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>The PredictSafe Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  subscriptionConfirmed: (planName: string) => ({
    subject: `Subscription Confirmed - ${planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${getEmailStyles(BRAND_COLORS.green, BRAND_COLORS.greenDark)}</style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>✅ Subscription Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
                <p>Your subscription for <strong style="color: ${BRAND_COLORS.green};">${planName}</strong> has been confirmed and is now active!</p>
              <p>You can now access all the premium features and predictions for your plan.</p>
                <div style="text-align: center;">
                  <a href="${SITE_URL}/dashboard" class="button">Go to Dashboard</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>The PredictSafe Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  subscriptionExpired: (planName: string) => ({
    subject: `Subscription Expired - ${planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${getEmailStyles(BRAND_COLORS.orange, BRAND_COLORS.orangeDark)}</style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>⏰ Subscription Expired</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
                <p>Your subscription for <strong style="color: ${BRAND_COLORS.orange};">${planName}</strong> has expired.</p>
              <p>To continue enjoying our premium predictions and features, please renew your subscription.</p>
                <div style="text-align: center;">
                  <a href="${SITE_URL}/subscribe" class="button">Renew Subscription</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>The PredictSafe Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  subscriptionRemoved: (planName: string) => ({
    subject: `Subscription Removed - ${planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${getEmailStyles(BRAND_COLORS.red, BRAND_COLORS.redDark)}</style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>⚠️ Subscription Removed</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
                <p>Your subscription for <strong style="color: ${BRAND_COLORS.red};">${planName}</strong> has been removed.</p>
              <p>Please renew your subscription to get back on track and continue accessing premium predictions.</p>
                <div style="text-align: center;">
                  <a href="${SITE_URL}/subscribe" class="button">Renew Subscription</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>The PredictSafe Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  adminNewSubscription: (userEmail: string, userName: string, planName: string) => ({
    subject: `New Subscription - ${planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${baseStyles.replace(BRAND_COLORS.primary, BRAND_COLORS.purple).replace(BRAND_COLORS.primaryDark, BRAND_COLORS.purpleDark)}
          .header { background: linear-gradient(135deg, ${BRAND_COLORS.purple} 0%, ${BRAND_COLORS.purpleDark} 100%); }
          .info-box { border-left-color: ${BRAND_COLORS.purple}; }
          </style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>🎉 New Subscription!</h1>
            </div>
            <div class="content">
              <p>Hello Admin,</p>
              <p>A new subscription has been created:</p>
              <div class="info-box">
                <p><strong>User:</strong> ${userName || userEmail}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Plan:</strong> ${planName}</p>
              </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>PredictSafe System</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  paymentApproved: (planName: string) => ({
    subject: `Payment Approved - ${planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${getEmailStyles(BRAND_COLORS.green, BRAND_COLORS.greenDark)}</style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>✅ Payment Approved!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
                <p>Great news! Your payment for <strong style="color: ${BRAND_COLORS.green};">${planName}</strong> has been approved and your subscription is now active!</p>
              <p>You can now access all premium features and predictions for your plan.</p>
                <div style="text-align: center;">
                  <a href="${SITE_URL}/dashboard" class="button">Go to Dashboard</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>The PredictSafe Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  adminNewPayment: (userEmail: string, userName: string, planName: string, amount: string, currency: string) => ({
    subject: `New Payment Submitted - ${planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${getEmailStyles(BRAND_COLORS.purple, BRAND_COLORS.purpleDark, BRAND_COLORS.purple, BRAND_COLORS.purpleDark, BRAND_COLORS.purple)}</style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>💰 New Payment Submitted!</h1>
            </div>
            <div class="content">
              <p>Hello Admin,</p>
              <p>A new payment has been submitted and requires your review:</p>
              <div class="info-box">
                <p><strong>User:</strong> ${userName || userEmail}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Plan:</strong> ${planName}</p>
                <p><strong>Amount:</strong> ${currency} ${amount}</p>
              </div>
              <p>Please review the payment proof and activate the subscription if payment is confirmed.</p>
                <div style="text-align: center;">
                  <a href="${SITE_URL}/admin/transactions" class="button">Review Payment</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>PredictSafe System</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  paymentRejected: (planName: string, reason?: string) => ({
    subject: `Payment Rejected - ${planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${baseStyles.replace(BRAND_COLORS.primary, BRAND_COLORS.red).replace(BRAND_COLORS.primaryDark, BRAND_COLORS.redDark)}
          .header { background: linear-gradient(135deg, ${BRAND_COLORS.red} 0%, ${BRAND_COLORS.redDark} 100%); }
          .alert-box { border-left-color: ${BRAND_COLORS.red}; }
          </style>
        </head>
        <body>
          <div style="padding: 20px;">
            <div class="email-wrapper">
            <div class="header">
                <img src="${LOGO_URL}" alt="PredictSafe Logo" class="logo" />
              <h1>❌ Payment Rejected</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
                <p>We regret to inform you that your payment for <strong style="color: ${BRAND_COLORS.red};">${planName}</strong> has been rejected.</p>
              ${reason ? `
              <div class="alert-box">
                <p><strong>Reason:</strong></p>
                <p>${reason}</p>
              </div>
              ` : ''}
              <p>If you believe this is an error, please contact our support team with your payment proof for review.</p>
              <p>You can resubmit your payment with a valid proof of payment.</p>
                <div style="text-align: center;">
                  <a href="${SITE_URL}/subscribe" class="button">Try Again</a>
                </div>
              </div>
              <div class="footer">
                <p><strong>Best regards,</strong></p>
                <p>The PredictSafe Team</p>
                <p style="margin-top: 12px; font-size: 13px;">If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
}

