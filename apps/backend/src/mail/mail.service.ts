import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { renderVerificationEmail } from './templates/verification-email.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: Resend | null;
  private readonly isConsoleMode: boolean;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const fromEmail = this.config.get<string>(
      'EMAIL_FROM',
      'onboarding@resend.dev',
    );
    const fromName = this.config.get<string>('EMAIL_FROM_NAME', 'HireFlow');
    this.fromAddress = `${fromName} <${fromEmail}>`;

    if (apiKey) {
      this.client = new Resend(apiKey);
      this.isConsoleMode = false;
      this.logger.log('MailService initialised in Resend mode');
    } else {
      // No API key → console-fallback. We still expose the same interface so
      // callers never branch on delivery mode.
      this.client = null;
      this.isConsoleMode = true;
      this.logger.warn(
        'RESEND_API_KEY not set — MailService running in console-fallback mode (emails are logged, not sent)',
      );
    }
  }

  // Sends the verification email. Email delivery must never block the signup
  // response, so all failures are caught and logged rather than thrown.
  async sendVerificationEmail(
    to: string,
    name: string,
    verificationLink: string,
  ): Promise<void> {
    const { html, text } = renderVerificationEmail({ name, verificationLink });
    const subject = 'Verify your HireFlow account';

    if (this.isConsoleMode || !this.client) {
      this.logger.log(
        [
          '',
          '──────────────────────────────────────────────────────────',
          '  📧  VERIFICATION EMAIL (console-fallback mode)',
          `  To:      ${to}`,
          `  Subject: ${subject}`,
          `  Link:    ${verificationLink}`,
          '──────────────────────────────────────────────────────────',
        ].join('\n'),
      );
      return;
    }

    try {
      const { error } = await this.client.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
        text,
      });

      if (error) {
        this.logger.error(
          `Resend rejected verification email to ${to}: ${error.message}`,
        );
        return;
      }

      this.logger.log(`Verification email sent to ${to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send verification email to ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
