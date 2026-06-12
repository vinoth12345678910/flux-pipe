import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  orgName: z.string().min(1).max(255),
  orgSlug: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
