import { z } from "zod";
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodString;
    RABBITMQ_URL: z.ZodString;
    JWT_SECRET: z.ZodString;
    JWT_REFRESH_SECRET: z.ZodString;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    SMTP_HOST: z.ZodOptional<z.ZodString>;
    SMTP_PORT: z.ZodOptional<z.ZodNumber>;
    SMTP_USER: z.ZodOptional<z.ZodString>;
    SMTP_PASS: z.ZodOptional<z.ZodString>;
    ENCRYPTION_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "error" | "info" | "debug" | "warn";
    PORT: number;
    DATABASE_URL: string;
    REDIS_URL: string;
    RABBITMQ_URL: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    SMTP_HOST?: string | undefined;
    SMTP_PORT?: number | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
    ENCRYPTION_KEY?: string | undefined;
}, {
    DATABASE_URL: string;
    REDIS_URL: string;
    RABBITMQ_URL: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "error" | "info" | "debug" | "warn" | undefined;
    PORT?: number | undefined;
    SMTP_HOST?: string | undefined;
    SMTP_PORT?: number | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
    ENCRYPTION_KEY?: string | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
export declare function parseEnv(): Env;
export declare function getEnv(): Env;
export {};
//# sourceMappingURL=env.d.ts.map