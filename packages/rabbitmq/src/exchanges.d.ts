export declare const EXCHANGES: {
    readonly EVENTS_INGESTED: "events.ingested";
    readonly EVENTS_PROCESSED: "events.processed";
    readonly EVENTS_FAILED: "events.failed";
    readonly EVENTS_RETRY: "events.retry";
};
export type ExchangeName = (typeof EXCHANGES)[keyof typeof EXCHANGES];
export declare function assertExchanges(): Promise<void>;
export declare function assertQueues(): Promise<void>;
export declare function assertBindings(): Promise<void>;
//# sourceMappingURL=exchanges.d.ts.map