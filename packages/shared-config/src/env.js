"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEnv = parseEnv;
exports.getEnv = getEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.z.coerce.number().default(3000),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    RABBITMQ_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    LOG_LEVEL: zod_1.z.enum(["debug", "info", "warn", "error"]).default("info"),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    ENCRYPTION_KEY: zod_1.z.string().min(32).optional(),
});
let parsedEnv = null;
function parseEnv() {
    if (parsedEnv)
        return parsedEnv;
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error("❌ Invalid environment variables:", result.error.flatten().fieldErrors);
        process.exit(1);
    }
    parsedEnv = result.data;
    return parsedEnv;
}
function getEnv() {
    if (!parsedEnv)
        return parseEnv();
    return parsedEnv;
}
//# sourceMappingURL=env.js.map