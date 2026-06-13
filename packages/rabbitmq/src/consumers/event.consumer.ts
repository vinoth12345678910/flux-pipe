import { getChannel, isClosedIntentionally } from "../connection";

const activeTimeouts = new Set<NodeJS.Timeout>();

export function clearAllConsumerTimeouts(): void {
  for (const timeout of activeTimeouts) {
    clearTimeout(timeout);
  }
  activeTimeouts.clear();
}

export async function consumeEvent(
  queue: string,
  onMessage: (data: Record<string, unknown>, ack: () => void, nack: () => void) => Promise<void>,
): Promise<void> {
  const setupConsumer = async () => {
    try {
      if (isClosedIntentionally()) return;
      const ch = await getChannel();
      
      ch.on("close", () => {
        if (!isClosedIntentionally()) {
          const timeout = setTimeout(() => {
            activeTimeouts.delete(timeout);
            setupConsumer();
          }, 1000);
          activeTimeouts.add(timeout);
        }
      });

      await ch.consume(queue, async (msg) => {
        if (!msg) return;

        const ack = () => {
          try { ch.ack(msg); } catch {}
        };
        const nack = () => {
          try { ch.nack(msg, false, false); } catch {}
        };

        try {
          const data = JSON.parse(msg.content.toString()) as Record<string, unknown>;
          await onMessage(data, ack, nack);
        } catch (err) {
          nack();
        }
      });
    } catch (err) {
      console.error("[consumeEvent] setupConsumer error:", err);
      const timeout = setTimeout(() => {
        activeTimeouts.delete(timeout);
        setupConsumer();
      }, 1000);
      activeTimeouts.add(timeout);
    }
  };

  await setupConsumer();
}
