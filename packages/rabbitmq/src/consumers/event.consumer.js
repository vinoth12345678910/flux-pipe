"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeEvent = consumeEvent;
const connection_1 = require("../connection");
async function consumeEvent(queue, onMessage) {
    const ch = await (0, connection_1.getChannel)();
    await ch.consume(queue, async (msg) => {
        if (!msg)
            return;
        const ack = () => ch.ack(msg);
        const nack = () => ch.nack(msg, false, false);
        try {
            const data = JSON.parse(msg.content.toString());
            await onMessage(data, ack, nack);
        }
        catch {
            nack();
        }
    });
}
//# sourceMappingURL=event.consumer.js.map