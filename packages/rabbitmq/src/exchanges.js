"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXCHANGES = void 0;
exports.assertExchanges = assertExchanges;
exports.assertQueues = assertQueues;
exports.assertBindings = assertBindings;
const connection_1 = require("./connection");
exports.EXCHANGES = {
    EVENTS_INGESTED: "events.ingested",
    EVENTS_PROCESSED: "events.processed",
    EVENTS_FAILED: "events.failed",
    EVENTS_RETRY: "events.retry",
};
async function assertExchanges() {
    const ch = await (0, connection_1.getChannel)();
    await ch.assertExchange(exports.EXCHANGES.EVENTS_INGESTED, "topic", { durable: true });
    await ch.assertExchange(exports.EXCHANGES.EVENTS_PROCESSED, "topic", { durable: true });
    await ch.assertExchange(exports.EXCHANGES.EVENTS_FAILED, "direct", { durable: true });
    await ch.assertExchange(exports.EXCHANGES.EVENTS_RETRY, "direct", { durable: true });
}
async function assertQueues() {
    const ch = await (0, connection_1.getChannel)();
    await ch.assertQueue("events.processing", {
        durable: true,
        deadLetterExchange: exports.EXCHANGES.EVENTS_FAILED,
        deadLetterRoutingKey: "dlq",
    });
    await ch.assertQueue("events.dlq", {
        durable: true,
    });
    await ch.assertQueue("delivery.webhook", {
        durable: true,
        deadLetterExchange: exports.EXCHANGES.EVENTS_RETRY,
        deadLetterRoutingKey: "retry",
    });
    await ch.assertQueue("events.retry.delay", {
        durable: true,
        messageTtl: 60000,
        deadLetterExchange: exports.EXCHANGES.EVENTS_PROCESSED,
        deadLetterRoutingKey: "retry",
    });
}
async function assertBindings() {
    const ch = await (0, connection_1.getChannel)();
    await ch.bindQueue("events.processing", exports.EXCHANGES.EVENTS_INGESTED, "event.*.*");
    await ch.bindQueue("events.dlq", exports.EXCHANGES.EVENTS_FAILED, "dlq");
    await ch.bindQueue("delivery.webhook", exports.EXCHANGES.EVENTS_PROCESSED, "delivery.*");
    await ch.bindQueue("events.retry.delay", exports.EXCHANGES.EVENTS_RETRY, "retry");
}
//# sourceMappingURL=exchanges.js.map