import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: { name: "Demo Org", slug: "demo-org", plan: "pro" },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@fluxpipe.io" },
    update: {},
    create: {
      email: "admin@fluxpipe.io",
      passwordHash,
      name: "Admin User",
      role: "admin",
      orgId: org.id,
    },
  });

  console.log(`Seeded: org=${org.slug}, user=${user.email}`);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
