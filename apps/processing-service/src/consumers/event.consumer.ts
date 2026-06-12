import { consumeEvent } from "@fluxpipe/rabbitmq";
import { transformQueue } from "../bullmq/queues";
import { checkIdempotency, storeIdempotencyKey } from "@fluxpipe/redis";
import { createLogger } from "@fluxpipe/logger";

const logger = createLogger("processing-service");

interface EventMessage {
  eventId: string;
  orgId: string;
  pipelineId: string;
  payload: Record<string, unknown>;
  traceId?: string;
}

export class EventConsumer {
  async start(): Promise<void> {
    await consumeEvent(
      "events.processing",
      async (message: Record<string, unknown>, ack: () => void, _nack: () => void) => {
        const msg = message as unknown as EventMessage;

        logger.info("Received event for processing", {
          eventId: msg.eventId,
          orgId: msg.orgId,
        });

        const existing = await checkIdempotency(msg.orgId, msg.eventId);

        if (existing) {
          logger.warn("Duplicate event skipped", {
            eventId: msg.eventId,
          });
          ack();
          return;
        }

        await transformQueue.add(
          "transform-event",
          {
            eventId: msg.eventId,
            orgId: msg.orgId,
            pipelineId: msg.pipelineId,
            payload: msg.payload,
            traceId: msg.traceId,
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          }
        );

        logger.info("Transform job created", {
          eventId: msg.eventId,
        });

        await storeIdempotencyKey(msg.orgId, msg.eventId, msg.eventId);
        logger.info("Idempotency key stored", {
          eventId: msg.eventId,
        });

        ack();
      }
    );

    logger.info("Processing consumer started", {
      queue: "events.processing",
    });
  }
}

export const eventConsumer = new EventConsumer();
