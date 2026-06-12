import { execSync } from "child_process";

async function migrate() {
  console.log("Running Prisma migrations...");
  execSync("pnpm --filter @fluxpipe/database prisma:migrate", { stdio: "inherit" });
  console.log("Migrations complete.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
