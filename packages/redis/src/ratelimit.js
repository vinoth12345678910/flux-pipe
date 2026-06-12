"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slidingWindow = slidingWindow;
const client_1 = require("./client");
async function slidingWindow(key, maxRequests, windowSeconds) {
    const client = (0, client_1.getClient)();
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const multi = client.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, windowSeconds);
    multi.pttl(key);
    const results = await multi.exec();
    if (!results) {
        return { current: 0, blocked: false, resetAt: now + windowSeconds * 1000 };
    }
    const count = results[2]?.[1] || 0;
    const ttl = results[4]?.[1] || windowSeconds * 1000;
    return {
        current: count,
        blocked: count > maxRequests,
        resetAt: now + ttl,
    };
}
//# sourceMappingURL=ratelimit.js.map