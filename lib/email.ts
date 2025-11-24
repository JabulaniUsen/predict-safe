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
export const emailTemplates = {
  predictionDropped: (planName: string) => ({
    subject: `New Predictions Available for ${planName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Predictions Available!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Great news! Predictions for <strong>${planName}</strong> have just been dropped!</p>
              <p>Don't miss out on these opportunities. Log in to your dashboard to view all the latest predictions.</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/predictions" class="button">View Predictions</a>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The PredictSafe Team</p>
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
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Subscription Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your subscription for <strong>${planName}</strong> has been confirmed and is now active!</p>
              <p>You can now access all the premium features and predictions for your plan.</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The PredictSafe Team</p>
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
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Subscription Expired</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your subscription for <strong>${planName}</strong> has expired.</p>
              <p>To continue enjoying our premium predictions and features, please renew your subscription.</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/subscribe" class="button">Renew Subscription</a>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The PredictSafe Team</p>
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
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Subscription Removed</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your subscription for <strong>${planName}</strong> has been removed.</p>
              <p>Please renew your subscription to get back on track and continue accessing premium predictions.</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/subscribe" class="button">Renew Subscription</a>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The PredictSafe Team</p>
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
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
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
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>PredictSafe System</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
}

