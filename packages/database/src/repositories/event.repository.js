"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRepository = void 0;
const client_1 = require("../client");
exports.eventRepository = {
    async create(data) {
        return (0, client_1.getClient)().event.create({ data });
    },
    async findById(id) {
        return (0, client_1.getClient)().event.findUnique({ where: { id } });
    },
    async updateStatus(id, status) {
        return (0, client_1.getClient)().event.update({ where: { id }, data: { status } });
    },
    async findByOrg(orgId, filters, skip = 0, take = 20) {
        const where = { orgId };
        if (filters.status)
            where.status = filters.status;
        if (filters.pipelineId)
            where.pipelineId = filters.pipelineId;
        if (filters.from || filters.to) {
            where.receivedAt = {};
            if (filters.from)
                where.receivedAt.gte = filters.from;
            if (filters.to)
                where.receivedAt.lte = filters.to;
        }
        const [events, total] = await Promise.all([
            (0, client_1.getClient)().event.findMany({
                where,
                skip,
                take,
                orderBy: { receivedAt: "desc" },
            }),
            (0, client_1.getClient)().event.count({ where }),
        ]);
        return { events, total };
    },
};
//# sourceMappingURL=event.repository.js.map