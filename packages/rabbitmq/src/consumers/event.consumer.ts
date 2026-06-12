import { getChannel } from "../connection";

export async function consumeEvent(
  queue: string,
  onMessage: (data: Record<string, unknown>, ack: () => void, nack: () => void) => Promise<void>,
): Promise<void> {
  const ch = await getChannel();
  await ch.consume(queue, async (msg) => {
    if (!msg) return;

    const ack = () => ch.ack(msg);
    const nack = () => ch.nack(msg, false, false);

    try {
      const data = JSON.parse(msg.content.toString()) as Record<string, unknown>;
      await onMessage(data, ack, nack);
    } catch {
      nack();
    }
  });
}
