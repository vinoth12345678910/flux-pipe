import { consumeEvent, publishEvent, getChannel, getConnection, disconnect, clearAllConsumerTimeouts } from '../../../packages/rabbitmq/src/index';
import { waitForMessage, purgeQueue } from '../../helpers/rabbitmq';

describe('event consumer', () => {
  const queue = 'test.consumer.queue';
  const exchange = 'test.consumer.exchange';

  beforeAll(async () => {
    const ch = await getChannel();
    await ch.assertExchange(exchange, 'direct', { durable: true });
    await ch.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': exchange,
        'x-dead-letter-routing-key': 'dlq',
      },
    });
    // Create DLQ queue
    await ch.assertQueue('test.consumer.dlq', { durable: true });
    await ch.bindQueue(queue, exchange, 'test');
    await ch.bindQueue('test.consumer.dlq', exchange, 'dlq');
  });

  afterAll(async () => {
    const ch = await getChannel();
    try {
      await ch.unbindQueue(queue, exchange, 'test');
      await ch.unbindQueue('test.consumer.dlq', exchange, 'dlq');
      await ch.deleteQueue(queue);
      await ch.deleteQueue('test.consumer.dlq');
      await ch.deleteExchange(exchange);
    } catch (err) {
      // Ignore
    }
  });

  beforeEach(async () => {
    await purgeQueue(queue);
    await purgeQueue('test.consumer.dlq');
  });

  afterEach(async () => {
    clearAllConsumerTimeouts();
    await disconnect();
  });

  it('handler is called with parsed payload', async () => {
    const payload = { test: 'consumer' };
    await publishEvent(exchange, 'test', payload);

    const handler = jest.fn().mockResolvedValue(undefined);

    await consumeEvent(queue, async (data, ack) => {
      await handler(data);
      ack();
    });

    // Wait a brief moment for async consumption
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('nacks message (no requeue) when handler throws', async () => {
    const payload = { test: 'nack' };
    await publishEvent(exchange, 'test', payload);

    await consumeEvent(queue, async (_data, _ack, nack) => {
      nack();
    });

    // A nacked message with noRequeue moves to the dead-letter exchange/queue
    const dlqMessage = await waitForMessage('test.consumer.dlq');
    expect(dlqMessage.content).toEqual(payload);
  });

  it('reconnects and resumes consuming after connection drop', async () => {
    const payloadBefore = { phase: 'before' };
    const payloadAfter = { phase: 'after' };

    const handler = jest.fn().mockResolvedValue(undefined);

    await consumeEvent(queue, async (data, ack) => {
      await handler(data);
      ack();
    });

    // 1. Consume before connection drop
    await publishEvent(exchange, 'test', payloadBefore);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(handler).toHaveBeenCalledWith(payloadBefore);

    // 2. Force close the channel
    const ch = await getChannel();
    await ch.close();

    // Wait 2s for close event and reconnection loop to establish
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Publish after connection drop
    await publishEvent(exchange, 'test', payloadAfter);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Mock handler calls:", handler.mock.calls);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenLastCalledWith(payloadAfter);
  });
});
