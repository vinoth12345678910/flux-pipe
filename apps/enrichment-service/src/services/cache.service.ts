import { createLogger } from "@fluxpipe/logger";

const logger = createLogger("enrichment-service");

const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

export const cacheService = {
  get<T>(key: string): T | null {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  },

  set(key: string, value: unknown, ttlSeconds = 300): void {
    memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    logger.debug("Cache set", { key, ttlSeconds });
  },

  delete(key: string): void {
    memoryCache.delete(key);
    logger.debug("Cache deleted", { key });
  },

  clear(): void {
    memoryCache.clear();
    logger.debug("Cache cleared");
  },
};
