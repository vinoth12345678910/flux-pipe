"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTraceId = generateTraceId;
exports.getTraceId = getTraceId;
exports.setTraceId = setTraceId;
exports.runWithTraceId = runWithTraceId;
const async_hooks_1 = require("async_hooks");
const crypto_1 = require("crypto");
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
function generateTraceId() {
    return (0, crypto_1.randomUUID)();
}
function getTraceId() {
    const store = asyncLocalStorage.getStore();
    return store?.get("traceId");
}
function setTraceId(traceId) {
    const store = asyncLocalStorage.getStore();
    store?.set("traceId", traceId);
}
function runWithTraceId(traceId, fn) {
    const store = new Map();
    store.set("traceId", traceId);
    return asyncLocalStorage.run(store, fn);
}
//# sourceMappingURL=trace.js.map