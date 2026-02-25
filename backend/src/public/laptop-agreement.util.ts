import crypto from 'crypto';

function b64url(buf: Buffer | string) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlJson(obj: any) {
  return b64url(JSON.stringify(obj));
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export type AgreementPayload = {
  v: string;              // policy version, e.g. "v0.1"
  tenantId: string;
  resourceType: 'desk' | 'table';
  resourceId: string;     // deskId or tableId
  signedName: string;
  signedPhone?: string | null;
  iat: number;            // issued at (unix seconds)
  exp: number;            // expires at (unix seconds)
};

export function signAgreementToken(payload: AgreementPayload, secret: string) {
  const header = { alg: 'HS256', typ: 'QROO-AGREEMENT' };
  const h = b64urlJson(header);
  const p = b64urlJson(payload);
  const data = `${h}.${p}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyAgreementToken(token: string, secret: string): AgreementPayload {
  if (!token || typeof token !== 'string') throw new Error('Missing agreement token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid agreement token format');

  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expectedSig = b64url(crypto.createHmac('sha256', secret).update(data).digest());

  if (!timingSafeEqual(s, expectedSig)) throw new Error('Invalid agreement token signature');

  const payloadJson = Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const payload = JSON.parse(payloadJson) as AgreementPayload;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || now > payload.exp) throw new Error('Agreement token expired');

  return payload;
}
