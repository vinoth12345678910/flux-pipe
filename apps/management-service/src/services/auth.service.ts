import { hashPassword, comparePassword, signAccessToken, signRefreshToken, verifyToken } from "@fluxpipe/auth";
import { userRepository, orgRepository, getClient } from "@fluxpipe/database";
import { addToDenylist, isDenylisted } from "@fluxpipe/redis";
import { AppError } from "@fluxpipe/shared-utils";

export const authService = {
  async register(data: { email: string; password: string; name: string; orgName: string; orgSlug: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new AppError(409, "EMAIL_EXISTS", "Email already registered");

    return getClient().$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: data.orgName, slug: data.orgSlug },
      });
      const passwordHash = await hashPassword(data.password);
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          role: "admin",
          orgId: org.id,
        },
      });
      const tokenPayload = { userId: user.id, orgId: org.id, role: user.role, scopes: ["*"] as string[] };
      return {
        accessToken: signAccessToken(tokenPayload),
        refreshToken: signRefreshToken(tokenPayload),
        user: { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId },
      };
    });
  },

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    const tokenPayload = { userId: user.id, orgId: user.orgId, role: user.role, scopes: ["*"] as string[] };
    return {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId },
    };
  },

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = verifyToken(refreshToken, true);
    } catch {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    const denylisted = await isDenylisted(payload.jti);
    if (denylisted) throw new AppError(401, "TOKEN_REVOKED", "Refresh token has been revoked");

    const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    await addToDenylist(payload.jti, ttl);

    const user = await userRepository.findById(payload.userId);
    if (!user) throw new AppError(401, "USER_NOT_FOUND", "User no longer exists");

    const tokenPayload = { userId: user.id, orgId: user.orgId, role: user.role, scopes: ["*"] as string[] };
    return {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
    };
  },

  async logout(jti: string, exp: number): Promise<void> {
    const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000));
    await addToDenylist(jti, ttl);
  },
};
