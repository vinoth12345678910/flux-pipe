"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEvent = publishEvent;
const connection_1 = require("../connection");
async function publishEvent(exchange, routingKey, data) {
    const ch = await (0, connection_1.getChannel)();
    const buffer = Buffer.from(JSON.stringify(data));
    ch.publish(exchange, routingKey, buffer, {
        persistent: true,
        contentType: "application/json",
        timestamp: Math.floor(Date.now() / 1000),
    });
}
//# sourceMappingURL=event.publisher.js.map