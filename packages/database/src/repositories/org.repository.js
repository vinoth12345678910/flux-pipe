"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgRepository = void 0;
const client_1 = require("../client");
exports.orgRepository = {
    async findById(id) {
        return (0, client_1.getClient)().organization.findUnique({ where: { id } });
    },
    async findBySlug(slug) {
        return (0, client_1.getClient)().organization.findUnique({ where: { slug } });
    },
    async create(data) {
        return (0, client_1.getClient)().organization.create({ data });
    },
    async updatePlan(id, plan) {
        return (0, client_1.getClient)().organization.update({ where: { id }, data: { plan } });
    },
};
//# sourceMappingURL=org.repository.js.map