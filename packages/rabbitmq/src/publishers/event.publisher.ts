import { getChannel } from "../connection";
import { getTraceId } from "@fluxpipe/logger";

export async function publishEvent(exchange: string, routingKey: string, data: Record<string, unknown>): Promise<void> {
  const ch = await getChannel();
  await ch.checkExchange(exchange);
  const buffer = Buffer.from(JSON.stringify(data));
  const traceId = getTraceId();

  ch.publish(exchange, routingKey, buffer, {
    persistent: true,
    contentType: "application/json",
    timestamp: Math.floor(Date.now() / 1000),
    headers: traceId ? { traceId } : {},
  });
}
