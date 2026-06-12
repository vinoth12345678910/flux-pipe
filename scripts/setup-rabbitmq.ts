import { assertExchanges, assertQueues, assertBindings, disconnect } from "@fluxpipe/rabbitmq";

async function setup() {
  console.log("Setting up RabbitMQ...");
  await assertExchanges();
  await assertQueues();
  await assertBindings();
  console.log("RabbitMQ setup complete.");
  await disconnect();
}

setup().catch((e) => {
  console.error(e);
  process.exit(1);
});
