import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

export function getClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
    });
  }
  return prisma;
}

export async function disconnectClient(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}
