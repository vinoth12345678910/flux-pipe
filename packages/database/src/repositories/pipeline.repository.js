"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineRepository = void 0;
const client_1 = require("../client");
exports.pipelineRepository = {
    async findById(id) {
        return (0, client_1.getClient)().pipeline.findUnique({ where: { id } });
    },
    async findByOrg(orgId, skip = 0, take = 20) {
        const [pipelines, total] = await Promise.all([
            (0, client_1.getClient)().pipeline.findMany({
                where: { orgId },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            (0, client_1.getClient)().pipeline.count({ where: { orgId } }),
        ]);
        return { pipelines, total };
    },
    async create(data) {
        return (0, client_1.getClient)().pipeline.create({ data });
    },
    async update(id, data) {
        return (0, client_1.getClient)().pipeline.update({ where: { id }, data });
    },
    async softDelete(id) {
        return (0, client_1.getClient)().pipeline.update({ where: { id }, data: { isActive: false } });
    },
    async findActive(orgId) {
        return (0, client_1.getClient)().pipeline.findMany({
            where: { orgId, isActive: true },
            orderBy: { createdAt: "desc" },
        });
    },
};
//# sourceMappingURL=pipeline.repository.js.map