"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destinationRepository = void 0;
const client_1 = require("../client");
exports.destinationRepository = {
    async findById(id) {
        return (0, client_1.getClient)().destination.findUnique({ where: { id } });
    },
    async findByPipeline(pipelineId) {
        return (0, client_1.getClient)().destination.findMany({ where: { pipelineId }, orderBy: { createdAt: "desc" } });
    },
    async create(data) {
        return (0, client_1.getClient)().destination.create({ data });
    },
    async update(id, data) {
        return (0, client_1.getClient)().destination.update({ where: { id }, data });
    },
    async delete(id) {
        return (0, client_1.getClient)().destination.delete({ where: { id } });
    },
};
//# sourceMappingURL=destination.repository.js.map