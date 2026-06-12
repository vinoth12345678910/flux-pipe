"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIdempotency = checkIdempotency;
exports.storeIdempotencyKey = storeIdempotencyKey;
const client_1 = require("./client");
const IDEMPOTENCY_TTL = 86400;
async function checkIdempotency(orgId, idempotencyKey) {
    const client = (0, client_1.getClient)();
    const key = `idempotency:${orgId}:${idempotencyKey}`;
    const cached = await client.get(key);
    return cached;
}
async function storeIdempotencyKey(orgId, idempotencyKey, eventId) {
    const client = (0, client_1.getClient)();
    const key = `idempotency:${orgId}:${idempotencyKey}`;
    await client.setex(key, IDEMPOTENCY_TTL, eventId);
}
//# sourceMappingURL=idempotency.js.map