"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryRepository = void 0;
const client_1 = require("../client");
exports.deliveryRepository = {
    async create(data) {
        return (0, client_1.getClient)().deliveryAttempt.create({ data });
    },
    async findByEvent(eventId) {
        return (0, client_1.getClient)().deliveryAttempt.findMany({
            where: { eventId },
            orderBy: { attemptedAt: "desc" },
        });
    },
    async findByDestination(destinationId, skip = 0, take = 20) {
        const [attempts, total] = await Promise.all([
            (0, client_1.getClient)().deliveryAttempt.findMany({
                where: { destinationId },
                skip,
                take,
                orderBy: { attemptedAt: "desc" },
            }),
            (0, client_1.getClient)().deliveryAttempt.count({ where: { destinationId } }),
        ]);
        return { attempts, total };
    },
    async countFailedByEvent(eventId) {
        return (0, client_1.getClient)().deliveryAttempt.count({
            where: { eventId, status: "failed" },
        });
    },
};
//# sourceMappingURL=delivery.repository.js.map