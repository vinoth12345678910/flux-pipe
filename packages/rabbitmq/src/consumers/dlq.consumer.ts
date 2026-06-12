import { getChannel } from "../connection";

export async function consumeDLQ(
  onMessage: (data: Record<string, unknown>, ack: () => void) => Promise<void>,
): Promise<void> {
  const ch = await getChannel();
  await ch.consume("events.dlq", async (msg) => {
    if (!msg) return;

    const ack = () => ch.ack(msg);

    try {
      const data = JSON.parse(msg.content.toString()) as Record<string, unknown>;
      await onMessage(data, ack);
    } catch {
      ch.ack(msg);
    }
  });
}
