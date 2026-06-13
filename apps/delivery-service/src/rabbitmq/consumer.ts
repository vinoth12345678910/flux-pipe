import { consumeEvent } from "@fluxpipe/rabbitmq";
import { createLogger } from "@fluxpipe/logger";
import { sagaService } from "../services/saga.service";

const logger = createLogger("delivery-service");

interface DeliveryMessage {
  eventId: string;
  orgId: string;
  pipelineId: string;
  destinationId: string;
  payload: Record<string, unknown>;
  config: Record<string, unknown>;
}

export class DeliveryConsumer {
  async start(): Promise<void> {
    await consumeEvent(
      "delivery.webhook",
      async (message: Record<string, unknown>, ack: () => void, nack: () => void) => {
        const msg = message as unknown as DeliveryMessage;

        logger.info("Received delivery message", {
          eventId: msg.eventId,
          destinationId: msg.destinationId,
        });

        try {
          const result = await sagaService.execute(
            msg.eventId,
            msg.orgId,
            msg.pipelineId,
            msg.payload,
          );

          if (result.success) {
            logger.info("Delivery completed for event", { eventId: msg.eventId });
          } else {
            logger.warn("Delivery completed with failures", {
              eventId: msg.eventId,
              failedDestinations: result.failedDestinations,
            });
          }

          ack();
        } catch (err) {
          logger.error("Delivery consumer error", {
            eventId: msg.eventId,
            error: err instanceof Error ? err.message : String(err),
          });
          nack();
        }
      },
    );

    logger.info("Delivery consumer started", { queue: "delivery.webhook" });
  }
}

export const deliveryConsumer = new DeliveryConsumer();
