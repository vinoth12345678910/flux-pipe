import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

export interface TokenPayload {
  userId: string;
  orgId: string;
  role: string;
  scopes: string[];
  jti: string;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
}

let config: JwtConfig | null = null;

export function initJwt(cfg: JwtConfig): void {
  config = cfg;
}

function getConfig(): JwtConfig {
  if (!config) throw new Error("JWT not initialized. Call initJwt() first.");
  return config;
}

export function signAccessToken(payload: Omit<TokenPayload, "jti">): string {
  const { secret } = getConfig();
  return jwt.sign({ ...payload, jti: randomUUID() }, secret, { expiresIn: "15m" });
}

export function signRefreshToken(payload: Omit<TokenPayload, "jti">): string {
  const { refreshSecret } = getConfig();
  return jwt.sign({ ...payload, jti: randomUUID() }, refreshSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string, isRefresh = false): TokenPayload {
  const { secret, refreshSecret } = getConfig();
  const key = isRefresh ? refreshSecret : secret;
  return jwt.verify(token, key) as TokenPayload;
}

export function decodeToken(token: string): TokenPayload | null {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string") return null;
  return decoded as unknown as TokenPayload;
}
