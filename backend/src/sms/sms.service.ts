import { Injectable, Logger } from '@nestjs/common';

type SmsSendResult = { ok: true } | { ok: false; error: string };

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private get provider() {
    return (process.env.SMS_PROVIDER || 'console').toLowerCase();
  }

  private get adminTo(): string[] {
    const raw = process.env.SMS_ADMIN_TO || '';
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  async sendToAdmin(message: string): Promise<SmsSendResult> {
    const to = this.adminTo;
    if (to.length === 0) {
      // No admin numbers configured → don't fail requests.
      this.logger.log(`[SMS disabled] ${message}`);
      return { ok: true };
    }

    if (this.provider === 'twilio') {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM;

      if (!sid || !token || !from) {
        this.logger.warn('SMS_PROVIDER=twilio but TWILIO_* env vars are missing. Falling back to console.');
        this.logger.log(`[SMS fallback] ${message}`);
        return { ok: true };
      }

      try {
        for (const num of to) {
          await this.sendTwilio({ sid, token, from, to: num, body: message });
        }
        return { ok: true };
      } catch (e: any) {
        this.logger.error(e?.message || e);
        return { ok: false, error: e?.message || 'SMS failed' };
      }
    }

    // Default provider: console (dev-friendly)
    this.logger.log(`[SMS] ${message}`);
    return { ok: true };
  }

  private async sendTwilio(args: { sid: string; token: string; from: string; to: string; body: string }) {
    const { sid, token, from, to, body } = args;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;

    const form = new URLSearchParams();
    form.set('From', from);
    form.set('To', to);
    form.set('Body', body);

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Twilio error ${res.status}: ${text}`);
    }
  }
}
