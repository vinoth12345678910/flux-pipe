"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.getChannel = getChannel;
exports.disconnect = disconnect;
const amqplib_1 = __importDefault(require("amqplib"));
let model = null;
let channel = null;
async function getConnection() {
    if (!model) {
        model = await amqplib_1.default.connect(process.env.RABBITMQ_URL || "amqp://localhost:5672");
    }
    return model;
}
async function getChannel() {
    if (!channel) {
        const conn = await getConnection();
        channel = await conn.createChannel();
    }
    return channel;
}
async function disconnect() {
    try {
        if (channel)
            await channel.close();
        if (model)
            await model.close();
    }
    finally {
        channel = null;
        model = null;
    }
}
//# sourceMappingURL=connection.js.map