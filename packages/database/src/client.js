"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.disconnectClient = disconnectClient;
const client_1 = require("@prisma/client");
let prisma;
function getClient() {
    if (!prisma) {
        prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
        });
    }
    return prisma;
}
async function disconnectClient() {
    if (prisma) {
        await prisma.$disconnect();
    }
}
//# sourceMappingURL=client.js.map