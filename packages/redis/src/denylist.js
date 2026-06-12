"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToDenylist = addToDenylist;
exports.isDenylisted = isDenylisted;
const client_1 = require("./client");
const DENYLIST_PREFIX = "denylist:jti:";
async function addToDenylist(jti, ttlSeconds) {
    const client = (0, client_1.getClient)();
    const key = `${DENYLIST_PREFIX}${jti}`;
    await client.setex(key, Math.max(ttlSeconds, 60), "1");
}
async function isDenylisted(jti) {
    const client = (0, client_1.getClient)();
    const key = `${DENYLIST_PREFIX}${jti}`;
    const result = await client.exists(key);
    return result === 1;
}
//# sourceMappingURL=denylist.js.map