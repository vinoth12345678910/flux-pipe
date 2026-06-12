"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeDLQ = consumeDLQ;
const connection_1 = require("../connection");
async function consumeDLQ(onMessage) {
    const ch = await (0, connection_1.getChannel)();
    await ch.consume("events.dlq", async (msg) => {
        if (!msg)
            return;
        const ack = () => ch.ack(msg);
        try {
            const data = JSON.parse(msg.content.toString());
            await onMessage(data, ack);
        }
        catch {
            ch.ack(msg);
        }
    });
}
//# sourceMappingURL=dlq.consumer.js.map