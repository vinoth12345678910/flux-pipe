import { getChannel } from "../connection";

export async function publishEvent(exchange: string, routingKey: string, data: Record<string, unknown>): Promise<void> {
  const ch = await getChannel();
  const buffer = Buffer.from(JSON.stringify(data));

  ch.publish(exchange, routingKey, buffer, {
    persistent: true,
    contentType: "application/json",
    timestamp: Math.floor(Date.now() / 1000),
  });
}
