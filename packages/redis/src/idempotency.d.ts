export declare function checkIdempotency(orgId: string, idempotencyKey: string): Promise<string | null>;
export declare function storeIdempotencyKey(orgId: string, idempotencyKey: string, eventId: string): Promise<void>;
//# sourceMappingURL=idempotency.d.ts.map