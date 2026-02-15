"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
let SmsService = SmsService_1 = class SmsService {
    constructor() {
        this.logger = new common_1.Logger(SmsService_1.name);
    }
    get provider() {
        return (process.env.SMS_PROVIDER || 'console').toLowerCase();
    }
    get adminTo() {
        const raw = process.env.SMS_ADMIN_TO || '';
        return raw
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }
    async sendToAdmin(message) {
        const to = this.adminTo;
        if (to.length === 0) {
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
            }
            catch (e) {
                this.logger.error(e?.message || e);
                return { ok: false, error: e?.message || 'SMS failed' };
            }
        }
        this.logger.log(`[SMS] ${message}`);
        return { ok: true };
    }
    async sendTwilio(args) {
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
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)()
], SmsService);
//# sourceMappingURL=sms.service.js.map