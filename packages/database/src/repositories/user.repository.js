"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const client_1 = require("../client");
exports.userRepository = {
    async findById(id) {
        return (0, client_1.getClient)().user.findUnique({ where: { id } });
    },
    async findByEmail(email) {
        return (0, client_1.getClient)().user.findUnique({ where: { email } });
    },
    async create(data) {
        return (0, client_1.getClient)().user.create({ data });
    },
    async updateRole(id, role) {
        return (0, client_1.getClient)().user.update({ where: { id }, data: { role } });
    },
};
//# sourceMappingURL=user.repository.js.map