import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<number>('MAIL_PORT') === 465,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
      connectionTimeout: 10000, // 10 seconds timeout
    });
  }

  async sendOtp(email: string, otp: string, userName: string = 'User') {
    const html = this.getOtpTemplate(otp, userName);

    try {
      this.logger.log(`Attempting to send OTP to ${email}...`);
      await this.transporter.sendMail({
        from: `"E-commerce CRM" <${this.configService.get('MAIL_FROM')}>`,
        to: email,
        subject: `${otp} is your verification code`,
        html: html,
      });
      this.logger.log(`OTP email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}: ${error.message}`);
      
      // Fallback for Development: Log to console so user isn't blocked
      this.logger.warn('--- MAIL FALLBACK ---');
      this.logger.warn(`OTP for ${email} (${userName}): ${otp}`);
      this.logger.warn('---------------------');
      
      // We don't rethrow the error here to ensure the user creation/auth flow finishes
      // especially in dev environments with SMTP issues.
    }
  }

  private getOtpTemplate(otp: string, userName: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Account</title>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .wrapper { width: 100%; padding: 40px 0; }
        .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #4f46e5; padding: 32px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 40px 32px; text-align: center; }
        .greeting { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
        .text { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 32px; }
        .otp-box { background: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 32px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #4f46e5; border: 1px solid #e2e8f0; }
        .expiry { font-size: 13px; color: #94a3b8; margin-top: 24px; }
        .footer { padding: 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>E-commerce CRM</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${userName},</div>
            <div class="text">
              To complete your sign-in and protect your account, please use the 6-digit verification code below.
            </div>
            <div class="otp-box">
              ${otp}
            </div>
            <div class="text">
              If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
            </div>
            <div class="expiry">
              This code will expire in 10 minutes.
            </div>
          </div>
          <div class="footer">
            &copy; 2026 E-commerce CRM. All rights reserved.<br>
            Professional Operations Infrastructure.
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}
