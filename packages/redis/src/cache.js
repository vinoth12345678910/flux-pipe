"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDelete = cacheDelete;
const client_1 = require("./client");
async function cacheGet(key) {
    const client = (0, client_1.getClient)();
    const data = await client.get(key);
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds = 300) {
    const client = (0, client_1.getClient)();
    const data = JSON.stringify(value);
    await client.setex(key, ttlSeconds, data);
}
async function cacheDelete(key) {
    const client = (0, client_1.getClient)();
    await client.del(key);
}
//# sourceMappingURL=cache.js.map