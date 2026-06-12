"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.connectClient = connectClient;
exports.disconnectClient = disconnectClient;
const ioredis_1 = __importDefault(require("ioredis"));
let client = null;
function getClient() {
    if (!client) {
        client = new ioredis_1.default(process.env.REDIS_URL || "redis://localhost:6379", {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 100, 3000),
            lazyConnect: true,
        });
        client.on("error", (err) => {
            console.error("Redis client error:", err.message);
        });
    }
    return client;
}
async function connectClient() {
    if (!client)
        getClient();
    if (client && client.status !== "ready" && client.status !== "connecting") {
        await client.connect();
    }
}
async function disconnectClient() {
    if (client) {
        await client.quit();
        client = null;
    }
}
//# sourceMappingURL=client.js.map