export declare function generateTraceId(): string;
export declare function getTraceId(): string | undefined;
export declare function setTraceId(traceId: string): void;
export declare function runWithTraceId<T>(traceId: string, fn: () => T): T;
//# sourceMappingURL=trace.d.ts.map