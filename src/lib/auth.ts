import crypto from "crypto";

export function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 100_000, 32, "sha256").toString("hex");
  return { salt: s, hash };
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const computed = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
}

function base64url(input: Buffer) {
  return input.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function signJwt(payload: Record<string, unknown>, secret: string, expiresInSec = 60 * 60 * 24) {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSec;
  const body = { ...payload, iat, exp };
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(body)));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const sigB64 = base64url(sig);
  return `${data}.${sigB64}`;
}

export function verifyJwt(token: string, secret: string): { valid: boolean; payload?: Record<string, unknown> } {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = base64url(crypto.createHmac("sha256", secret).update(data).digest());
  if (expected !== s) return { valid: false };
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && now > payload.exp) return { valid: false };
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
