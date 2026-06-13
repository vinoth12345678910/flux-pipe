import { getChannel } from '../../packages/rabbitmq/src/index';

export interface ParsedMessage {
  content: any;
  fields: any;
  properties: any;
}

export async function waitForMessage(queue: string, timeoutMs = 5000): Promise<ParsedMessage> {
  const ch = await getChannel();
  await ch.checkQueue(queue);

  let consumerTag = '';
  let resolved = false;

  return new Promise<ParsedMessage>(async (resolve, reject) => {
    const timer = setTimeout(async () => {
      if (consumerTag) {
        try {
          await ch.cancel(consumerTag);
        } catch (err) {
          // Ignore
        }
      }
      reject(new Error(`Timeout waiting for message on queue ${queue} after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const consumeResult = await ch.consume(
        queue,
        async (msg) => {
          if (msg) {
            clearTimeout(timer);
            resolved = true;

            try {
              ch.ack(msg);
            } catch (err) {
              // Ignore
            }

            if (consumerTag) {
              try {
                await ch.cancel(consumerTag);
              } catch (err) {
                // Ignore
              }
            }

            try {
              const parsed = JSON.parse(msg.content.toString());
              resolve({
                content: parsed,
                fields: msg.fields,
                properties: msg.properties,
              });
            } catch (err) {
              resolve({
                content: msg.content.toString(),
                fields: msg.fields,
                properties: msg.properties,
              });
            }
          }
        },
        { noAck: false }
      );

      consumerTag = consumeResult.consumerTag;
      if (resolved) {
        try {
          await ch.cancel(consumerTag);
        } catch (err) {
          // Ignore
        }
      }
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

export async function purgeQueue(queue: string): Promise<void> {
  const ch = await getChannel();
  try {
    await ch.purgeQueue(queue);
  } catch (err) {
    // Queue might not exist yet
  }
}
