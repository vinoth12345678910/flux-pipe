import { getChannel } from "./connection";

export const EXCHANGES = {
  EVENTS_INGESTED: "events.ingested",
  EVENTS_PROCESSED: "events.processed",
  EVENTS_FAILED: "events.failed",
  EVENTS_RETRY: "events.retry",
} as const;

export type ExchangeName = (typeof EXCHANGES)[keyof typeof EXCHANGES];

export async function assertExchanges(): Promise<void> {
  const ch = await getChannel();

  await ch.assertExchange(EXCHANGES.EVENTS_INGESTED, "topic", { durable: true });
  await ch.assertExchange(EXCHANGES.EVENTS_PROCESSED, "topic", { durable: true });
  await ch.assertExchange(EXCHANGES.EVENTS_FAILED, "direct", { durable: true });
  await ch.assertExchange(EXCHANGES.EVENTS_RETRY, "direct", { durable: true });
}

export async function assertQueues(): Promise<void> {
  const ch = await getChannel();

  await ch.assertQueue("events.processing", {
    durable: true,
    deadLetterExchange: EXCHANGES.EVENTS_FAILED,
    deadLetterRoutingKey: "dlq",
  });

  await ch.assertQueue("events.dlq", {
    durable: true,
  });

  await ch.assertQueue("delivery.webhook", {
    durable: true,
    deadLetterExchange: EXCHANGES.EVENTS_RETRY,
    deadLetterRoutingKey: "retry",
  });

  await ch.assertQueue("events.retry.delay", {
    durable: true,
    messageTtl: 60000,
    deadLetterExchange: EXCHANGES.EVENTS_PROCESSED,
    deadLetterRoutingKey: "retry",
  });
}

export async function assertBindings(): Promise<void> {
  const ch = await getChannel();

  await ch.bindQueue("events.processing", EXCHANGES.EVENTS_INGESTED, "event.*.*");
  await ch.bindQueue("events.dlq", EXCHANGES.EVENTS_FAILED, "dlq");
  await ch.bindQueue("delivery.webhook", EXCHANGES.EVENTS_PROCESSED, "delivery.*");
  await ch.bindQueue("events.retry.delay", EXCHANGES.EVENTS_RETRY, "retry");
}
