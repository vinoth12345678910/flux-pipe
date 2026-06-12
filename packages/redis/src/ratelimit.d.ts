interface SlidingWindowResult {
    current: number;
    blocked: boolean;
    resetAt: number;
}
export declare function slidingWindow(key: string, maxRequests: number, windowSeconds: number): Promise<SlidingWindowResult>;
export {};
//# sourceMappingURL=ratelimit.d.ts.map