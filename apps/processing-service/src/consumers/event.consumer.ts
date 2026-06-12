// RabbitMQ consumer for events.processing queue
// TODO: Implement when building workers
import { consume } from "@fluxpipe/rabbitmq";
import { transformQueue } from "../bullmq/queues";
import { idempotencyStore } from "@fluxpipe/redis";
import { logger } from "@fluxpipe/logger";

interface EventMessage {
  eventId: string;
  orgId: string;
  pipelineId: string;
  payload: Record<string, unknown>;
  traceId?: string;
}

export class EventConsumer {
  async start(): Promise<void> {


    await consume(
      "events.processing",
      async (message: EventMessage) => {

        logger.info("Received event for processing", {
          eventId: message.eventId,
          orgId: message.orgId,
        });

        

        const existing = await idempotencyStore.get(
          message.orgId,
          message.eventId
        );

        if (existing) {
          

          logger.warn("Duplicate event skipped", {
            eventId: message.eventId,
          });

          return;
        }



        await transformQueue.add(
          "transform-event",
          {
            eventId: message.eventId,
            orgId: message.orgId,
            pipelineId: message.pipelineId,
            payload: message.payload,
            traceId: message.traceId,
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
          eventId: message.eventId,
        });

       

        await idempotencyStore.set(
          message.orgId,
          message.eventId,
          message.eventId,
          86400
        );

        logger.info("Idempotency key stored", {
          eventId: message.eventId,
        });

      }
    );

    logger.info("Processing consumer started", {
      queue: "events.processing",
    });
  }
}

export const eventConsumer = new EventConsumer();