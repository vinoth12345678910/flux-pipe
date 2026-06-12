import { initJwt, signAccessToken, signRefreshToken, verifyToken, decodeToken } from "@fluxpipe/auth";
import { getEnv } from "@fluxpipe/shared-config";

export { signAccessToken, signRefreshToken, verifyToken, decodeToken };

export function initJwtFromEnv(): void {
  const env = getEnv();
  initJwt({
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
  });
}
