export declare function cacheGet<T>(key: string): Promise<T | null>;
export declare function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
export declare function cacheDelete(key: string): Promise<void>;
//# sourceMappingURL=cache.d.ts.map